package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.game.AiRequestRateLimiter;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class MediaUploadServiceTest {
    private static final String BASE_URL = "http://localhost:8080/media";
    private static final SceneImagePolicy IMAGE_POLICY = new SceneImagePolicy(8 * 1024 * 1024, 10_000,
            8_000_000, 64 * 1024 * 1024, 4, 3, Duration.ofSeconds(5), Duration.ofSeconds(12));
    private static final ModerationResult SAFE = new ModerationResult(false, List.of());

    @TempDir Path mediaDirectory;
    private LocalMediaStorageService storage;
    private OpenAiModerationClient moderation;
    private MediaUploadService upload;

    @BeforeEach
    void setUp() {
        storage = new LocalMediaStorageService(mediaDirectory.toString(), BASE_URL);
        moderation = mock(OpenAiModerationClient.class);
        upload = new MediaUploadService(storage, moderation, new BlockedWordList(List.of("từ cấm")),
                new AiRequestRateLimiter(Clock.systemUTC()), IMAGE_POLICY);
    }

    @Test
    void matchesPngByDecodedContentAndReadsItAfterRestartWithoutANetworkFetch() throws IOException {
        when(moderation.moderateImage(any(), eq("image/png"))).thenReturn(SAFE);
        var saved = upload.upload(file("../original-name.jpg", "application/octet-stream", png()), "teacher");
        assertThat(saved.mediaUrl()).matches(".*/uploads/[0-9a-f-]{36}[.]png");
        assertThat(saved.mediaType()).isEqualTo(MediaUploadService.Kind.IMAGE);

        var restarted = new LocalMediaStorageService(mediaDirectory.toString(), BASE_URL);
        var dns = mock(PublicAddressResolver.class);
        var network = mock(SceneImageTransport.class);
        var sceneLoader = new SceneImageLoader(dns, network, IMAGE_POLICY, restarted);
        LoadedSceneImage image = sceneLoader.load(URI.create(saved.mediaUrl()), "http://localhost:5173");
        assertThat(image.width()).isEqualTo(3);
        assertThat(ImageIO.read(new ByteArrayInputStream(image.bytes())).getHeight()).isEqualTo(2);
        verifyNoInteractions(dns, network);
        assertThat(restarted.getPublicMedia("uploads", "../" + fileName(saved))).isEmpty();
    }

    @Test
    void acceptsWebpAndServesTheModeratedPngBytes() throws IOException {
        byte[] webp = Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA");
        when(moderation.moderateImage(any(), eq("image/png"))).thenReturn(SAFE);

        var saved = upload.upload(file("scene.webp", "image/webp", webp), "teacher");

        var image = storage.getPublicMedia("uploads", fileName(saved)).orElseThrow();
        assertThat(image.contentType()).isEqualTo("image/png");
        try (var bytes = image.resource().getInputStream()) {
            assertThat(ImageIO.read(bytes).getWidth()).isEqualTo(1);
        }
    }

    @Test
    void malformedOrOversizedImageIsRejectedBeforeModeration() throws IOException {
        assertCode(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT,
                file("bad.png", "image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G'}));
        assertCode(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT,
                file("big.png", "image/png", new byte[5 * 1024 * 1024 + 1]));
        verifyNoInteractions(moderation);
        assertDirectoryEmpty();
    }

    @Test
    void flaggedOrIncompleteModerationNeverWritesAPublicFile() throws IOException {
        var uploadFile = file("image.png", "image/png", png());
        when(moderation.moderateImage(any(), eq("image/png")))
                .thenReturn(new ModerationResult(true, List.of("violence")))
                .thenThrow(new ModerationUnavailableException("missing response"));

        assertCode(ErrorCode.UNSAFE_CONTENT, uploadFile);
        assertCode(ErrorCode.SERVICE_UNAVAILABLE, uploadFile);
        assertDirectoryEmpty();
    }

    @Test
    void audioTagsAreRemovedBeforeTranscriptionAndStorage() throws IOException {
        byte[] frames = mp3Frames();
        byte[] tagged = new byte[10 + frames.length + 128];
        tagged[0] = 'I'; tagged[1] = 'D'; tagged[2] = '3'; tagged[3] = 4;
        System.arraycopy(frames, 0, tagged, 10, frames.length);
        tagged[10 + frames.length] = 'T'; tagged[11 + frames.length] = 'A'; tagged[12 + frames.length] = 'G';
        when(moderation.transcribeMp3(frames)).thenReturn("Một con mèo.");
        when(moderation.moderateTranscript("Một con mèo.")).thenReturn(SAFE);

        var saved = upload.upload(file("voice.mp3", "audio/mpeg", tagged), "teacher");

        assertThat(saved.mediaType()).isEqualTo(MediaUploadService.Kind.AUDIO);
        assertThat(storage.getPublicMedia("uploads", fileName(saved)).orElseThrow().resource().getContentAsByteArray())
                .containsExactly(frames);
    }

    @Test
    void unsafeOrUnrecognizableSpeechIsRejected() throws IOException {
        byte[] frames = mp3Frames();
        when(moderation.transcribeMp3(frames)).thenReturn("Chứa từ cấm", "");
        var file = file("voice.mp3", "audio/mpeg", frames);

        assertCode(ErrorCode.UNSAFE_CONTENT, file);
        assertCode(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT, file);
        assertDirectoryEmpty();
    }

    private void assertCode(ErrorCode code, MockMultipartFile file) {
        assertThatThrownBy(() -> upload.upload(file, "teacher"))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }

    private void assertDirectoryEmpty() throws IOException {
        try (var files = Files.list(mediaDirectory)) {
            assertThat(files).isEmpty();
        }
    }

    private static byte[] png() throws IOException {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), "png", output);
        return output.toByteArray();
    }

    private static byte[] mp3Frames() {
        // MPEG1 Layer III at 128 kbit/s and 44.1 kHz. Transcription/decoding is isolated behind the provider mock.
        byte[] frames = new byte[834];
        byte[] header = {(byte) 0xff, (byte) 0xfb, (byte) 0x90, 0};
        System.arraycopy(header, 0, frames, 0, header.length);
        System.arraycopy(header, 0, frames, 417, header.length);
        return frames;
    }

    private static MockMultipartFile file(String name, String type, byte[] bytes) {
        return new MockMultipartFile("file", name, type, bytes);
    }

    private static String fileName(MediaUploadService.UploadedMedia saved) {
        return saved.mediaUrl().substring(saved.mediaUrl().lastIndexOf('/') + 1);
    }
}
