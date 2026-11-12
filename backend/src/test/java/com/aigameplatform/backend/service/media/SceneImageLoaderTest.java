package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.io.BufferedInputStream;
import java.net.InetAddress;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class SceneImageLoaderTest {

    private static final URI SCENE = URI.create("https://images.example.edu/scene.png");
    private static final InetAddress PUBLIC = address(93, 184, 216, 34);

    @Test
    void loadsImageAndUsesDecodedDimensions() throws Exception {
        FakeTransport transport = new FakeTransport(response(200, "image/png", png(240, 180)));
        SceneImageLoader loader = loader((host, deadline) -> List.of(PUBLIC), transport, policy());

        LoadedSceneImage result = loader.load(SCENE);

        assertThat(result.width()).isEqualTo(240);
        assertThat(result.height()).isEqualTo(180);
        assertThat(result.bytes()).isEqualTo(png(240, 180));
        assertThat(transport.addresses).containsExactly(PUBLIC);
    }

    @Test
    void browserImageLoadRequiresMatchingCorsResponse() throws Exception {
        String origin = "http://localhost:5173";
        FakeTransport blocked = new FakeTransport(response(200, "image/png", png(2, 2)));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), blocked, policy()).load(SCENE, origin))
                .isInstanceOf(InvalidSceneImageException.class).hasMessageContaining("CORS");

        FakeTransport allowed = new FakeTransport(new SceneImageResponse(200,
                Map.of("content-type", "image/png", "access-control-allow-origin", origin), png(2, 2)));
        var image = loader((host, deadline) -> List.of(PUBLIC), allowed, policy()).load(SCENE, origin);
        assertThat(image.width()).isEqualTo(2);
        assertThat(allowed.origins).containsExactly(origin);
    }

    @Test
    void rejectsNonHttpsUrlsBeforeNetworkAccess() {
        FakeTransport transport = new FakeTransport();

        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), transport, policy())
                .load(URI.create("http://images.example.edu/scene.png")))
                .isInstanceOf(InvalidSceneImageException.class);
        assertThat(transport.requests).isEmpty();
    }

    @Test
    void rejectsPrivateAndReservedResolvedAddressesBeforeConnecting() {
        for (InetAddress blocked : List.of(address(127, 0, 0, 1), address(10, 1, 2, 3), address(192, 0, 2, 4))) {
            FakeTransport transport = new FakeTransport();
            assertThatThrownBy(() -> loader((host, deadline) -> List.of(blocked), transport, policy()).load(SCENE))
                    .isInstanceOf(InvalidSceneImageException.class);
            assertThat(transport.requests).isEmpty();
        }
    }

    @Test
    void rejectsAResponseIfDnsIncludesAnyPrivateAddress() {
        FakeTransport transport = new FakeTransport();

        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC, address(169, 254, 10, 20)), transport, policy())
                .load(SCENE)).isInstanceOf(InvalidSceneImageException.class);
        assertThat(transport.requests).isEmpty();
    }

    @Test
    void acceptsGlobalIpv6AndRejectsUlaLinkLocalAndDocumentationRanges() throws Exception {
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("2001:4860:4860::8888"))).isTrue();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("2001:200::1"))).isTrue();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("fc00::1"))).isFalse();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("fe80::1"))).isFalse();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("2001:db8::1"))).isFalse();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("2001:2::1"))).isFalse();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("2001::1"))).isFalse();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("2002::1"))).isFalse();
        assertThat(SceneImageLoader.isPublicAddress(InetAddress.getByName("3fff::1"))).isFalse();
    }

    @Test
    void rejectsReservedIpv4SubnetsWithoutBlockingNeighboringRanges() {
        for (InetAddress reserved : List.of(address(192, 0, 0, 1), address(192, 0, 2, 1),
                address(198, 18, 0, 1), address(198, 51, 100, 1), address(203, 0, 113, 1))) {
            assertThat(SceneImageLoader.isPublicAddress(reserved)).isFalse();
        }
        for (InetAddress neighboring : List.of(address(192, 0, 1, 1), address(198, 51, 99, 1),
                address(198, 51, 101, 1))) {
            assertThat(SceneImageLoader.isPublicAddress(neighboring)).isTrue();
        }
    }

    @Test
    void followsOnlyBoundedHttpsRedirectsAndRevalidatesTheTarget() {
        FakeTransport transport = new FakeTransport(
                new SceneImageResponse(302, Map.of("location", "https://127.0.0.1/private.png"), new byte[0]));

        assertThatThrownBy(() -> loader((host, deadline) -> host.equals("127.0.0.1")
                ? List.of(address(127, 0, 0, 1)) : List.of(PUBLIC), transport, policy()).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);
        assertThat(transport.requests).containsExactly(SCENE);
    }

    @Test
    void enforcesResponseByteLimitAndContentType() throws Exception {
        SceneImagePolicy small = policy(64, 2, 4_000, 64_000);
        FakeTransport oversized = new FakeTransport(response(200, "image/png", new byte[65]));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), oversized, small).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);

        FakeTransport wrongType = new FakeTransport(response(200, "text/html", png(2, 2)));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), wrongType, policy()).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);
    }

    @Test
    void rejectsCorruptOrOverDimensionImages() throws Exception {
        FakeTransport corrupt = new FakeTransport(response(200, "image/png", "not an image".getBytes()));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), corrupt, policy()).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);

        FakeTransport tooLarge = new FakeTransport(response(200, "image/png", png(101, 40)));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), tooLarge, policy(1_000_000, 100, 10_000, 1_000_000))
                .load(SCENE)).isInstanceOf(InvalidSceneImageException.class);
    }

    @Test
    void rejectsTooManyRedirects() {
        FakeTransport transport = new FakeTransport(
                new SceneImageResponse(302, Map.of("location", "/next"), new byte[0]),
                new SceneImageResponse(302, Map.of("location", "/again"), new byte[0]),
                new SceneImageResponse(302, Map.of("location", "/last"), new byte[0]));

        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), transport, policy()).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);
        assertThat(transport.requests).hasSize(3);
    }

    @Test
    void preservesEncodedPathAndQueryWithoutDecodingThem() {
        URI encoded = URI.create("https://images.example.edu/a%2Fb.png?token=abc%2B123%26scope%3Dread");
        FakeTransport transport = new FakeTransport(response(200, "image/png", pngUnchecked(2, 2)));
        loader((host, deadline) -> List.of(PUBLIC), transport, policy()).load(encoded);
        assertThat(transport.requests).containsExactly(encoded);
    }

    @Test
    void percentEncodesUnicodePathAndQueryBeforeHttpTransport() throws Exception {
        URI unicode = new URI("https", null, "images.example.edu", -1, "/\u1EA3nh.png", "q=c\u00E2u h\u1ECFi", null);
        FakeTransport transport = new FakeTransport(response(200, "image/png", pngUnchecked(2, 2)));
        loader((host, deadline) -> List.of(PUBLIC), transport, policy()).load(unicode);
        assertThat(transport.requests.getFirst().toASCIIString())
                .isEqualTo("https://images.example.edu/%E1%BA%A3nh.png?q=c%C3%A2u%20h%E1%BB%8Fi");
    }

    @Test
    void rejectsImageBytesWhoseActualFormatDoesNotMatchDeclaredMimeType() throws Exception {
        byte[] png = png(2, 2);
        FakeTransport mislabeledPng = new FakeTransport(response(200, "image/jpeg", png));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), mislabeledPng, policy()).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);

        ByteArrayOutputStream tiff = new ByteArrayOutputStream();
        assertThat(ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "tiff", tiff)).isTrue();
        FakeTransport unsupportedTiff = new FakeTransport(response(200, "image/png", tiff.toByteArray()));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), unsupportedTiff, policy()).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);
    }

    @Test
    void rejectsDecodedMemoryOverConfiguredLimitBeforeAllocatingRaster() throws Exception {
        BufferedImage gray16 = new BufferedImage(128, 128, BufferedImage.TYPE_USHORT_GRAY);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(gray16, "png", output);
        SceneImagePolicy smallLimit = policy(1_000_000, 1_000, 1_000_000, 1_000);
        FakeTransport transport = new FakeTransport(response(200, "image/png", output.toByteArray()));
        assertThatThrownBy(() -> loader((host, deadline) -> List.of(PUBLIC), transport, smallLimit).load(SCENE))
                .isInstanceOf(InvalidSceneImageException.class);
    }

    @Test
    void classifiesOversizeHttpBodiesAsInputErrorsAcrossFramingModes() {
        assertThatThrownBy(() -> parse("HTTP/1.1 200 OK\r\nContent-Length: 9\r\n\r\n123456789", 8))
                .isInstanceOf(SceneImageBodyTooLargeException.class);
        assertThatThrownBy(() -> parse("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n5\r\n12345\r\n4\r\n6789\r\n0\r\n\r\n", 8))
                .isInstanceOf(SceneImageBodyTooLargeException.class);
        assertThatThrownBy(() -> parse("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n1\r\na\r\n7fffffffffffffff\r\n", Long.MAX_VALUE))
                .isInstanceOf(SceneImageBodyTooLargeException.class);
        assertThatThrownBy(() -> parse("HTTP/1.1 200 OK\r\n\r\n123456789", 8))
                .isInstanceOf(SceneImageBodyTooLargeException.class);
    }

    @Test
    void parsesChunkedAndContentLengthBodiesAndRejectsTruncatedLength() throws Exception {
        assertThat(parse("HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nabc", 8).body())
                .isEqualTo("abc".getBytes(StandardCharsets.US_ASCII));
        assertThat(parse("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n\r\n", 8).body())
                .isEqualTo("abc".getBytes(StandardCharsets.US_ASCII));
        assertThatThrownBy(() -> parse("HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nabc", 8))
                .isInstanceOf(java.io.IOException.class);
    }

    @Test
    void capsConcurrentDownloadsForOneLoaderInstance() throws Exception {
        CountDownLatch firstBatchEntered = new CountDownLatch(2);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger active = new AtomicInteger();
        AtomicInteger maxActive = new AtomicInteger();
        SceneImageTransport slow = (uri, address, policy, deadline) -> {
            int now = active.incrementAndGet();
            maxActive.accumulateAndGet(now, Math::max);
            firstBatchEntered.countDown();
            try {
                if (!release.await(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS)) {
                    throw new java.net.SocketTimeoutException("test response timeout");
                }
                return response(200, "image/png", pngUnchecked(2, 2));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new java.io.IOException(e);
            } finally {
                active.decrementAndGet();
            }
        };
        SceneImageLoader bounded = loader((host, deadline) -> List.of(PUBLIC), slow,
                new SceneImagePolicy(1_000_000, 10_000, 4_000_000, 16_000_000, 2, 2,
                        Duration.ofSeconds(4), Duration.ofSeconds(4)));
        var executor = Executors.newFixedThreadPool(5);
        try {
            var requests = java.util.stream.IntStream.range(0, 5)
                    .mapToObj(ignored -> executor.submit(() -> bounded.load(SCENE))).toList();
            assertThat(firstBatchEntered.await(1, TimeUnit.SECONDS)).isTrue();
            assertThat(active.get()).isEqualTo(2);
            release.countDown();
            for (var request : requests) assertThat(request.get(3, TimeUnit.SECONDS).width()).isEqualTo(2);
            assertThat(maxActive.get()).isEqualTo(2);
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    private static SceneImageResponse parse(String response, long limit) throws Exception {
        return PinnedHttpsSceneImageTransport.readResponse(new BufferedInputStream(
                new ByteArrayInputStream(response.getBytes(StandardCharsets.US_ASCII))), limit);
    }

    private static byte[] pngUnchecked(int width, int height) {
        try { return png(width, height); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }

    private static SceneImageLoader loader(PublicAddressResolver resolver, SceneImageTransport transport,
            SceneImagePolicy policy) {
        return new SceneImageLoader(resolver, transport, policy);
    }

    private static SceneImagePolicy policy() {
        return policy(1_000_000, 10_000, 4_000_000, 16_000_000);
    }

    private static SceneImagePolicy policy(long maxBytes, int maxDimension, long maxPixels, long maxDecodedBytes) {
        return new SceneImagePolicy(maxBytes, maxDimension, maxPixels, maxDecodedBytes, 4, 2,
                Duration.ofSeconds(2), Duration.ofSeconds(4));
    }

    private static SceneImageResponse response(int status, String contentType, byte[] bytes) {
        return new SceneImageResponse(status, Map.of("content-type", contentType), bytes);
    }

    private static byte[] png(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    private static InetAddress address(int a, int b, int c, int d) {
        try {
            return InetAddress.getByAddress(new byte[] {(byte) a, (byte) b, (byte) c, (byte) d});
        } catch (java.net.UnknownHostException e) {
            throw new IllegalStateException(e);
        }
    }

    private static final class FakeTransport implements SceneImageTransport {
        private final Deque<SceneImageResponse> responses = new ArrayDeque<>();
        private final List<URI> requests = new ArrayList<>();
        private final List<InetAddress> addresses = new ArrayList<>();
        private final List<String> origins = new ArrayList<>();

        private FakeTransport(SceneImageResponse... responses) {
            this.responses.addAll(List.of(responses));
        }

        @Override
        public SceneImageResponse get(URI uri, InetAddress address, SceneImagePolicy policy, long deadlineNanos) {
            return get(uri, address, policy, deadlineNanos, null);
        }

        @Override
        public SceneImageResponse get(URI uri, InetAddress address, SceneImagePolicy policy, long deadlineNanos,
                String origin) {
            requests.add(uri);
            addresses.add(address);
            origins.add(origin);
            return responses.removeFirst();
        }
    }
}
