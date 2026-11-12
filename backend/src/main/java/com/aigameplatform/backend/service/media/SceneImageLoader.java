package com.aigameplatform.backend.service.media;

import java.awt.image.SampleModel;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.IDN;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;

/** Fetches one caller-supplied scene while pinning each HTTPS connection to a checked public address. */
@Component
public class SceneImageLoader {
    private static final Set<String> ACCEPTED_MEDIA_TYPES = Set.of("image/png", "image/jpeg", "image/gif", "image/bmp");
    private static final ThreadPoolExecutor DECODER = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(2), task -> {
                Thread thread = new Thread(task, "scene-image-decoder");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());
    private final PublicAddressResolver resolver;
    private final SceneImageTransport transport;
    private final SceneImagePolicy policy;
    private final Semaphore loadSlots;

    public SceneImageLoader(PublicAddressResolver resolver, SceneImageTransport transport, SceneImagePolicy policy) {
        this.resolver = resolver;
        this.transport = transport;
        this.policy = policy;
        this.loadSlots = new Semaphore(policy.maxConcurrentLoads());
    }

    public LoadedSceneImage load(URI source) {
        return load(source, null);
    }

    /** Loads an asset for browser rendering and verifies CORS for the configured application origin. */
    public LoadedSceneImage load(URI source, String browserOrigin) {
        if (browserOrigin != null) validateOrigin(browserOrigin);
        long deadlineNanos = System.nanoTime() + policy.requestTimeout().toNanos();
        boolean acquired;
        try {
            acquired = loadSlots.tryAcquire(Math.max(1, deadlineNanos - System.nanoTime()), TimeUnit.NANOSECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SceneImageUnavailableException("Interrupted while waiting to load scene image", e);
        }
        if (!acquired) throw new SceneImageUnavailableException("Timed out waiting to load scene image", null);
        try {
            return loadWithPermit(source, deadlineNanos, browserOrigin);
        } finally {
            loadSlots.release();
        }
    }

    private LoadedSceneImage loadWithPermit(URI source, long deadlineNanos, String browserOrigin) {
        URI current = validateUri(source);
        for (int redirect = 0; ; redirect++) {
            List<InetAddress> addresses = resolveAndValidate(current.getHost(), deadlineNanos);
            SceneImageResponse response;
            try {
                // The transport connects to this exact address; it must not resolve the hostname again.
                response = transport.get(current, addresses.getFirst(), policy, deadlineNanos, browserOrigin);
            } catch (SceneImageBodyTooLargeException e) {
                throw new InvalidSceneImageException("Scene image exceeds the allowed size", e);
            } catch (IOException | RuntimeException e) {
                if (e instanceof InvalidSceneImageException invalid) throw invalid;
                throw new SceneImageUnavailableException("Could not load scene image", e);
            }

            if (isRedirect(response.statusCode())) {
                if (redirect >= policy.maxRedirects()) {
                    throw new InvalidSceneImageException("Scene image exceeded the redirect limit");
                }
                String location = response.header("location");
                if (location == null || location.isBlank()) {
                    throw new InvalidSceneImageException("Scene image redirect is missing Location");
                }
                try {
                    current = validateUri(current.resolve(URI.create(location)));
                } catch (IllegalArgumentException e) {
                    throw new InvalidSceneImageException("Scene image redirect URL is invalid", e);
                }
                continue;
            }
            if (response.statusCode() >= 500) {
                throw new SceneImageUnavailableException("Scene image service is unavailable", null);
            }
            if (response.statusCode() != 200) {
                throw new InvalidSceneImageException("Scene image could not be accessed");
            }
            if (browserOrigin != null && !allowsOrigin(response.header("access-control-allow-origin"), browserOrigin)) {
                throw new InvalidSceneImageException("Scene image does not allow browser rendering through CORS");
            }

            byte[] bytes = response.body();
            if (bytes.length == 0 || bytes.length > policy.maxBytes()) {
                throw new InvalidSceneImageException("Scene image size is invalid");
            }
            String mediaType = mediaType(response.header("content-type"));
            if (!ACCEPTED_MEDIA_TYPES.contains(mediaType)) {
                throw new InvalidSceneImageException("Scene image must be PNG, JPEG, GIF, or BMP");
            }
            int[] dimensions = decodeDimensions(bytes, mediaType, policy, deadlineNanos);
            return new LoadedSceneImage(bytes, mediaType, dimensions[0], dimensions[1]);
        }
    }

    private static void validateOrigin(String value) {
        try {
            URI origin = URI.create(value);
            if (origin.getHost() == null || origin.getUserInfo() != null || origin.getQuery() != null
                    || origin.getFragment() != null || !("https".equalsIgnoreCase(origin.getScheme())
                            || "http".equalsIgnoreCase(origin.getScheme()))
                    || origin.getRawPath() != null && !origin.getRawPath().isEmpty()
                            && !"/".equals(origin.getRawPath())) {
                throw new IllegalArgumentException("Invalid browser origin");
            }
        } catch (IllegalArgumentException invalid) {
            throw new InvalidSceneImageException("Configured browser origin is invalid", invalid);
        }
    }

    private static boolean allowsOrigin(String allowed, String origin) {
        if (allowed == null) return false;
        return allowed.trim().equals("*") || allowed.trim().equalsIgnoreCase(origin);
    }

    private List<InetAddress> resolveAndValidate(String host, long deadlineNanos) {
        List<InetAddress> addresses;
        try {
            addresses = resolver.resolve(host, deadlineNanos);
        } catch (UnknownHostException e) {
            if (System.nanoTime() >= deadlineNanos) {
                throw new SceneImageUnavailableException("Scene image request timed out", e);
            }
            throw new SceneImageUnavailableException("Could not resolve scene image host", e);
        }
        if (addresses == null || addresses.isEmpty() || addresses.stream().anyMatch(a -> !isPublicAddress(a))) {
            throw new InvalidSceneImageException("Scene image URL must resolve only to public IP addresses");
        }
        return List.copyOf(addresses);
    }

    private static URI validateUri(URI uri) {
        if (uri == null || uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
                || uri.getPort() != -1 && uri.getPort() != 443
                || !"https".equalsIgnoreCase(uri.getScheme()) || uri.toString().length() > 2048) {
            throw new InvalidSceneImageException("Scene image URL must use public HTTPS on port 443");
        }
        String host;
        try {
            String uriHost = unbracket(uri.getHost());
            host = uriHost.contains(":") ? uriHost.toLowerCase(Locale.ROOT)
                    : IDN.toASCII(uriHost).toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException e) {
            throw new InvalidSceneImageException("Scene image host is invalid", e);
        }
        if (host.equals("localhost") || host.endsWith(".localhost") || host.endsWith(".local")
                || host.endsWith(".internal")) {
            throw new InvalidSceneImageException("Scene image URL must use a public host");
        }
        try {
            String authorityHost = host.contains(":") ? "[" + host + "]" : host;
            String rawPath = uri.getRawPath();
            if (rawPath == null || rawPath.isEmpty()) rawPath = "/";
            StringBuilder normalized = new StringBuilder("https://").append(authorityHost);
            if (uri.getPort() == 443) normalized.append(":443");
            normalized.append(rawPath);
            if (uri.getRawQuery() != null) normalized.append('?').append(uri.getRawQuery());
            URI result = URI.create(normalized.toString());
            if (result.toASCIIString().getBytes(StandardCharsets.US_ASCII).length > 2048) {
                throw new InvalidSceneImageException("Scene image URL is too long");
            }
            // Keep HTTP request targets ASCII-safe while retaining percent-encoded path/query octets.
            return URI.create(result.toASCIIString());
        } catch (IllegalArgumentException e) {
            throw new InvalidSceneImageException("Scene image URL is invalid", e);
        }
    }

    private static String unbracket(String host) {
        return host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
    }

    static boolean isPublicAddress(InetAddress address) {
        if (address == null || address.isAnyLocalAddress() || address.isLoopbackAddress()
                || address.isLinkLocalAddress() || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return false;
        }
        byte[] b = address.getAddress();
        if (address instanceof Inet4Address) {
            int a = Byte.toUnsignedInt(b[0]);
            int second = Byte.toUnsignedInt(b[1]);
            int third = Byte.toUnsignedInt(b[2]);
            if (a == 0 || a >= 224 || a == 100 && second >= 64 && second <= 127
                    || a == 192 && (second == 168 || second == 0 && (third == 0 || third == 2)
                            || second == 88 && third == 99)
                    || a == 198 && (second == 18 || second == 19 || second == 51 && third == 100)
                    || a == 203 && second == 0 && third == 113) {
                return false;
            }
            return true;
        }
        if (address instanceof Inet6Address) {
            // Only global-unicast 2000::/3 is allowed; reject IANA special-purpose/transition blocks.
            int first = Byte.toUnsignedInt(b[0]);
            if ((first & 0xe0) != 0x20) return false;
            int second = Byte.toUnsignedInt(b[1]);
            int third = Byte.toUnsignedInt(b[2]);
            if (first == 0x20 && second == 0x01 && third <= 0x01) return false;
            if (first == 0x20 && second == 0x02) return false; // 6to4 transition
            if (first == 0x3f && second == 0xff && (third & 0xf0) == 0x00) return false; // documentation
            if (Byte.toUnsignedInt(b[0]) == 0x20 && Byte.toUnsignedInt(b[1]) == 0x01
                    && Byte.toUnsignedInt(b[2]) == 0x0d && Byte.toUnsignedInt(b[3]) == 0xb8) return false;
            if (Byte.toUnsignedInt(b[0]) == 0x20 && Byte.toUnsignedInt(b[1]) == 0x01
                    && Byte.toUnsignedInt(b[2]) == 0x00 && (Byte.toUnsignedInt(b[3]) & 0xf0) == 0x10) return false;
            return true;
        }
        return false;
    }

    private static boolean isRedirect(int code) {
        return code == 301 || code == 302 || code == 303 || code == 307 || code == 308;
    }

    private static String mediaType(String header) {
        if (header == null) return "";
        int semicolon = header.indexOf(';');
        return (semicolon < 0 ? header : header.substring(0, semicolon)).trim().toLowerCase(Locale.ROOT);
    }

    private static int[] decodeDimensions(byte[] bytes, String declaredMediaType, SceneImagePolicy policy,
            long deadlineNanos) {
        Future<int[]> decode = null;
        try {
            if (System.nanoTime() >= deadlineNanos) throw new TimeoutException("Scene image deadline expired");
            decode = DECODER.submit(() -> decodeDimensionsNow(bytes, declaredMediaType, policy, deadlineNanos));
            long remaining = deadlineNanos - System.nanoTime();
            if (remaining <= 0) throw new TimeoutException("Scene image deadline expired");
            return decode.get(remaining, TimeUnit.NANOSECONDS);
        } catch (TimeoutException e) {
            cancelDecode(decode);
            throw new SceneImageUnavailableException("Scene image decode exceeded the request time limit", e);
        } catch (InterruptedException e) {
            cancelDecode(decode);
            Thread.currentThread().interrupt();
            throw new SceneImageUnavailableException("Interrupted while decoding scene image", e);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof InvalidSceneImageException invalid) throw invalid;
            if (cause instanceof SceneImageUnavailableException unavailable) throw unavailable;
            throw new InvalidSceneImageException("Scene image could not be decoded", cause);
        } catch (RuntimeException e) {
            if (e instanceof SceneImageUnavailableException unavailable) throw unavailable;
            if (e instanceof InvalidSceneImageException invalid) throw invalid;
            throw new SceneImageUnavailableException("Scene image decoder is busy", e);
        }
    }

    private static int[] decodeDimensionsNow(byte[] bytes, String declaredMediaType, SceneImagePolicy policy,
            long deadlineNanos) {
        try {
            try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (input == null) throw new InvalidSceneImageException("Scene image data could not be read");
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new InvalidSceneImageException("Scene data is not a supported image");
                ImageReader reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    String actualType = actualMediaType(reader.getFormatName());
                    if (!declaredMediaType.equals(actualType)) {
                        throw new InvalidSceneImageException("Scene image content type does not match image data");
                    }
                    int width = reader.getWidth(0);
                    int height = reader.getHeight(0);
                    if (width <= 0 || height <= 0) throw new InvalidSceneImageException("Scene image dimensions are invalid");
                    if (width > policy.maxDimension() || height > policy.maxDimension()
                            || (long) width * height > policy.maxPixels()) {
                        throw new InvalidSceneImageException("Scene image dimensions exceed the allowed limit");
                    }
                    var imageType = reader.getRawImageType(0);
                    if (imageType == null) imageType = reader.getImageTypes(0).hasNext() ? reader.getImageTypes(0).next() : null;
                    if (imageType == null || decodedBytes(imageType.getSampleModel(), width, height) > policy.maxDecodedBytes()) {
                        throw new InvalidSceneImageException("Decoded scene image would exceed the memory limit");
                    }
                    if (System.nanoTime() >= deadlineNanos) {
                        throw new SceneImageUnavailableException("Scene image request timed out", null);
                    }
                    if (reader.read(0) == null) throw new InvalidSceneImageException("Scene image could not be decoded");
                    if (System.nanoTime() >= deadlineNanos) {
                        throw new SceneImageUnavailableException("Scene image request timed out", null);
                    }
                    return new int[] {width, height};
                } finally {
                    reader.dispose();
                }
            }
        } catch (InvalidSceneImageException | SceneImageUnavailableException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw new InvalidSceneImageException("Scene image could not be decoded", e);
        }
    }

    private static void cancelDecode(Future<?> decode) {
        if (decode == null) return;
        decode.cancel(true);
        DECODER.remove((Runnable) decode);
    }

    private static long decodedBytes(SampleModel sampleModel, int width, int height) {
        long bitsPerPixel = 0;
        for (int bits : sampleModel.getSampleSize()) bitsPerPixel = Math.addExact(bitsPerPixel, bits);
        long bits = Math.multiplyExact((long) width * height, bitsPerPixel);
        long bytes = (bits + 7) / 8;
        // Account for the decoded raster plus color model/conversion allocation during inspection.
        return Math.multiplyExact(bytes, 2);
    }

    private static String actualMediaType(String formatName) {
        return switch (formatName.toLowerCase(Locale.ROOT)) {
            case "png" -> "image/png";
            case "jpeg", "jpg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "bmp" -> "image/bmp";
            default -> "";
        };
    }
}
