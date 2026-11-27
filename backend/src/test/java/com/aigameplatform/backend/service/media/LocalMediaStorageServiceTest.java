package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalMediaStorageServiceTest {

    @Test
    @DisplayName("upload ghi file ra thư mục và trả về URL hợp lệ")
    void testUploadSuccessful(@TempDir Path tempDir) throws IOException {
        String baseUrl = "http://localhost:8080/media";
        LocalMediaStorageService storage = new LocalMediaStorageService(tempDir.toString(), baseUrl);

        byte[] content = "test audio data".getBytes();
        String resultUrl = storage.upload("tts/audio-123.mp3", content, "audio/mpeg");

        assertThat(resultUrl).isEqualTo("http://localhost:8080/media/tts/audio-123.mp3");
        Path writtenFile = tempDir.resolve("tts/audio-123.mp3");
        assertThat(Files.exists(writtenFile)).isTrue();
        assertThat(Files.readAllBytes(writtenFile)).isEqualTo(content);
    }

    @Test
    @DisplayName("upload ném ngoại lệ nếu tham số null")
    void testUploadNullArguments(@TempDir Path tempDir) {
        LocalMediaStorageService storage = new LocalMediaStorageService(tempDir.toString(), "http://localhost");

        assertThatThrownBy(() -> storage.upload(null, new byte[] {1}, "audio/mpeg"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> storage.upload("file.mp3", null, "audio/mpeg"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
