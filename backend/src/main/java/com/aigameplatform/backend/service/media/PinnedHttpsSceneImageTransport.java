package com.aigameplatform.backend.service.media;

import java.io.ByteArrayOutputStream;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.SNIHostName;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import org.springframework.stereotype.Component;

/** Small HTTP/1.1 client so DNS validation and the actual socket use the same resolved address. */
@Component
public class PinnedHttpsSceneImageTransport implements SceneImageTransport {
    private static final int MAX_HEADER_BYTES = 32 * 1024;
    private static final int MAX_LINE_BYTES = 8 * 1024;
    private static final ScheduledExecutorService DEADLINE_CLOSER = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "scene-image-deadline");
        thread.setDaemon(true);
        return thread;
    });

    @Override
    public SceneImageResponse get(URI uri, InetAddress pinnedAddress, SceneImagePolicy policy, long deadlineNanos)
            throws IOException {
        return get(uri, pinnedAddress, policy, deadlineNanos, null);
    }

    @Override
    public SceneImageResponse get(URI uri, InetAddress pinnedAddress, SceneImagePolicy policy, long deadlineNanos,
            String origin) throws IOException {
        int port = uri.getPort() == -1 ? 443 : uri.getPort();
        Socket raw = new Socket();
        long remaining = deadlineNanos - System.nanoTime();
        if (remaining <= 0) throw new java.net.SocketTimeoutException("Scene image request timed out");
        ScheduledFuture<?> forceClose = DEADLINE_CLOSER.schedule(() -> {
            try { raw.close(); } catch (IOException ignored) { }
        }, remaining, TimeUnit.NANOSECONDS);
        try (raw) {
            int connectTimeout = Math.min(millis(policy.connectTimeout()), remainingMillis(deadlineNanos));
            raw.connect(new InetSocketAddress(pinnedAddress, port), connectTimeout);
            raw.setSoTimeout(remainingMillis(deadlineNanos));
            String host = unbracket(uri.getHost());
            try (SSLSocket tls = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault())
                    .createSocket(raw, host, port, true)) {
                tls.setUseClientMode(true);
                SSLParameters parameters = tls.getSSLParameters();
                parameters.setEndpointIdentificationAlgorithm("HTTPS");
                if (!isIpLiteral(host)) parameters.setServerNames(java.util.List.of(new SNIHostName(host)));
                tls.setSSLParameters(parameters);
                tls.setSoTimeout(remainingMillis(deadlineNanos));
                tls.startHandshake();
                tls.setSoTimeout(remainingMillis(deadlineNanos));
                tls.getOutputStream().write(request(uri, origin).getBytes(StandardCharsets.US_ASCII));
                tls.getOutputStream().flush();
                return readResponse(new BufferedInputStream(new DeadlineInputStream(tls.getInputStream(), tls, deadlineNanos)),
                        policy.maxBytes());
            }
        } finally {
            forceClose.cancel(false);
        }
    }

    private static String request(URI uri, String origin) {
        String path = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
        if (uri.getRawQuery() != null) path += "?" + uri.getRawQuery();
        String host = unbracket(uri.getHost());
        if (host.contains(":")) host = "[" + host + "]";
        return "GET " + path + " HTTP/1.1\r\n"
                + "Host: " + host + "\r\n"
                + "User-Agent: InteractiveLearningGamePlatform/1.0\r\n"
                + "Accept: image/png, image/jpeg, image/gif, image/bmp\r\n"
                + "Accept-Encoding: identity\r\n"
                + (origin == null ? "" : "Origin: " + origin + "\r\n")
                + "Connection: close\r\n\r\n";
    }

    static SceneImageResponse readResponse(BufferedInputStream input, long maxBytes) throws IOException {
        String statusLine = readLine(input, MAX_LINE_BYTES);
        if (statusLine == null || !statusLine.startsWith("HTTP/1.")) throw new IOException("Invalid HTTP status line");
        String[] statusParts = statusLine.split(" ", 3);
        if (statusParts.length < 2) throw new IOException("Invalid HTTP status line");
        int status;
        try {
            status = Integer.parseInt(statusParts[1]);
        } catch (NumberFormatException e) {
            throw new IOException("Invalid HTTP status code", e);
        }

        Map<String, String> headers = new LinkedHashMap<>();
        int headerBytes = statusLine.length();
        while (true) {
            String line = readLine(input, MAX_LINE_BYTES);
            if (line == null) throw new IOException("Incomplete HTTP headers");
            headerBytes += line.length() + 2;
            if (headerBytes > MAX_HEADER_BYTES) throw new IOException("HTTP headers exceed limit");
            if (line.isEmpty()) break;
            int colon = line.indexOf(':');
            if (colon <= 0) throw new IOException("Malformed HTTP header");
            String name = line.substring(0, colon).trim().toLowerCase(Locale.ROOT);
            String value = line.substring(colon + 1).trim();
            headers.merge(name, value, (left, right) -> left + "," + right);
        }

        byte[] body = new byte[0];
        if (status == 200) {
            String encoding = headers.getOrDefault("content-encoding", "identity");
            if (!encoding.equalsIgnoreCase("identity")) throw new IOException("Compressed HTTP body is not accepted");
            String transferEncoding = headers.getOrDefault("transfer-encoding", "");
            if (!transferEncoding.isBlank() && !transferEncoding.equalsIgnoreCase("chunked")) {
                throw new IOException("Unsupported HTTP transfer encoding");
            }
            if (transferEncoding.equalsIgnoreCase("chunked")) {
                body = readChunked(input, maxBytes);
            } else if (headers.containsKey("content-length")) {
                long length;
                try {
                    length = Long.parseLong(headers.get("content-length"));
                } catch (NumberFormatException e) {
                    throw new IOException("Invalid Content-Length", e);
                }
                if (length < 0 || length > maxBytes || length > Integer.MAX_VALUE) {
                    throw new SceneImageBodyTooLargeException();
                }
                body = readExactly(input, (int) length);
            } else {
                body = readUntilEnd(input, maxBytes);
            }
        }
        return new SceneImageResponse(status, headers, body);
    }

    private static byte[] readChunked(BufferedInputStream input, long maxBytes) throws IOException {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        while (true) {
            String line = readLine(input, MAX_LINE_BYTES);
            if (line == null) throw new IOException("Incomplete chunk header");
            String sizeText = line.split(";", 2)[0].trim();
            long size;
            try {
                size = Long.parseLong(sizeText, 16);
            } catch (NumberFormatException e) {
                throw new IOException("Invalid chunk size", e);
            }
            if (size < 0 || size > maxBytes - body.size()
                    || size > Integer.MAX_VALUE - (long) body.size()) {
                throw new SceneImageBodyTooLargeException();
            }
            if (size == 0) {
                int trailerBytes = 0;
                while (true) {
                    String trailer = readLine(input, MAX_LINE_BYTES);
                    if (trailer == null) throw new IOException("Incomplete HTTP trailers");
                    trailerBytes += trailer.length() + 2;
                    if (trailerBytes > MAX_HEADER_BYTES) throw new IOException("HTTP trailers exceed limit");
                    if (trailer.isEmpty()) return body.toByteArray();
                }
            }
            body.write(readExactly(input, (int) size));
            if (input.read() != '\r' || input.read() != '\n') throw new IOException("Malformed chunk delimiter");
        }
    }

    private static byte[] readUntilEnd(BufferedInputStream input, long maxBytes) throws IOException {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) != -1) {
            if ((long) body.size() + count > maxBytes || (long) body.size() + count > Integer.MAX_VALUE) {
                throw new SceneImageBodyTooLargeException();
            }
            body.write(buffer, 0, count);
        }
        return body.toByteArray();
    }

    private static byte[] readExactly(BufferedInputStream input, int length) throws IOException {
        byte[] result = new byte[length];
        int offset = 0;
        while (offset < length) {
            int count = input.read(result, offset, length - offset);
            if (count == -1) throw new IOException("Truncated HTTP body");
            offset += count;
        }
        return result;
    }

    private static String readLine(BufferedInputStream input, int maxBytes) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        boolean carriageReturn = false;
        while (line.size() <= maxBytes) {
            int value = input.read();
            if (value == -1) return line.size() == 0 ? null : throwEof();
            if (carriageReturn) {
                if (value != '\n') throw new IOException("Malformed HTTP line ending");
                return line.toString(StandardCharsets.US_ASCII);
            }
            if (value == '\r') carriageReturn = true;
            else line.write(value);
        }
        throw new IOException("HTTP line exceeds limit");
    }

    private static String throwEof() throws IOException {
        throw new IOException("Incomplete HTTP line");
    }

    private static int millis(java.time.Duration duration) {
        return (int) Math.min(Integer.MAX_VALUE, Math.max(1, duration.toMillis()));
    }

    private static int remainingMillis(long deadlineNanos) throws java.net.SocketTimeoutException {
        long remaining = deadlineNanos - System.nanoTime();
        if (remaining <= 0) throw new java.net.SocketTimeoutException("Scene image request timed out");
        return (int) Math.max(1, Math.min(Integer.MAX_VALUE, remaining / 1_000_000));
    }

    private static boolean isIpLiteral(String host) {
        return host.indexOf(':') >= 0 || host.matches("[0-9.]+");
    }

    private static String unbracket(String host) {
        return host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
    }

    private static final class DeadlineInputStream extends InputStream {
        private final InputStream delegate;
        private final Socket socket;
        private final long deadlineNanos;

        private DeadlineInputStream(InputStream delegate, Socket socket, long deadlineNanos) {
            this.delegate = delegate;
            this.socket = socket;
            this.deadlineNanos = deadlineNanos;
        }

        @Override
        public int read() throws IOException {
            setRemainingTimeout();
            return delegate.read();
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            setRemainingTimeout();
            return delegate.read(buffer, offset, length);
        }

        private void setRemainingTimeout() throws IOException {
            long remaining = deadlineNanos - System.nanoTime();
            if (remaining <= 0) throw new java.net.SocketTimeoutException("Scene image request timed out");
            socket.setSoTimeout((int) Math.max(1, Math.min(Integer.MAX_VALUE, remaining / 1_000_000)));
        }
    }
}
