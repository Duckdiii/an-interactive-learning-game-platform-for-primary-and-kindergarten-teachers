package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ElevenLabsTtsClientTest {
    private static final String ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech/voice-test"
            + "?output_format=mp3_44100_128&enable_logging=false";

    @Test
    void sendsConfiguredVoiceAndModelAndValidatesReturnedMp3() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        byte[] mp3 = mp3Frame();
        server.expect(requestTo(ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("xi-api-key", "elevenlabs-test-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "text": "Café, count to three!",
                          "model_id": "eleven_flash_v2_5"
                        }
                        """))
                .andRespond(withSuccess(mp3, MediaType.valueOf("audio/mpeg")));

        var audio = new ElevenLabsTtsClient(builder, "elevenlabs-test-key", "voice-test",
                "eleven_flash_v2_5", new Mp3AudioValidator()).synthesizeEnglish("  Cafe\u0301, count to three!  ");

        assertThat(audio.audio()).isEqualTo(mp3);
        assertThat(audio.durationSeconds()).isPositive();
        server.verify();
    }

    @Test
    void failsBeforeCallingProviderWhenApiKeyIsMissing() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        assertThatThrownBy(() -> new ElevenLabsTtsClient(builder, " ", "voice-test",
                "eleven_flash_v2_5", new Mp3AudioValidator()).synthesizeEnglish("Hello"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ELEVENLABS_API_KEY");

        server.verify();
    }

    @Test
    void rejectsTextOverThreeHundredUnicodeCharactersBeforeCallingProvider() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        assertThatThrownBy(() -> new ElevenLabsTtsClient(builder, "test-key", "voice-test",
                "eleven_flash_v2_5", new Mp3AudioValidator()).synthesizeEnglish("a".repeat(301)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("300 Unicode characters");

        server.verify();
    }

    @Test
    void rejectsSuccessfulResponsesThatAreNotMp3Audio() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(ENDPOINT)).andRespond(withSuccess("not an mp3", MediaType.TEXT_PLAIN));

        assertThatThrownBy(() -> new ElevenLabsTtsClient(builder, "test-key", "voice-test",
                "eleven_flash_v2_5", new Mp3AudioValidator()).synthesizeEnglish("Hello"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MP3");

        server.verify();
    }

    @Test
    void rejectsProviderErrorsWithoutExposingCredentials() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(ENDPOINT)).andRespond(org.springframework.test.web.client.response.MockRestResponseCreators
                .withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> new ElevenLabsTtsClient(builder, "private-test-key", "voice-test",
                "eleven_flash_v2_5", new Mp3AudioValidator()).synthesizeEnglish("Hello"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageNotContaining("private-test-key");

        server.verify();
    }

    @Test
    void readsNoMoreThanOneBytePastTheConfiguredMp3Limit() {
        CountingInputStream body = new CountingInputStream(
                new byte[Mp3AudioValidator.MAX_FILE_BYTES * 4]);

        assertThatThrownBy(() -> ElevenLabsTtsClient.readBoundedAudio(body))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256 KiB");
        assertThat(body.bytesRead()).isEqualTo(Mp3AudioValidator.MAX_FILE_BYTES + 1);
    }

    private static byte[] mp3Frame() {
        byte[] frame = new byte[104];
        frame[0] = (byte) 0xFF;
        frame[1] = (byte) 0xF3;
        frame[2] = (byte) 0x40;
        return frame;
    }

    private static final class CountingInputStream extends ByteArrayInputStream {
        private int bytesRead;

        private CountingInputStream(byte[] bytes) {
            super(bytes);
        }

        @Override
        public synchronized int read(byte[] buffer, int offset, int length) {
            int read = super.read(buffer, offset, length);
            if (read > 0) bytesRead += read;
            return read;
        }

        int bytesRead() {
            return bytesRead;
        }
    }
}
