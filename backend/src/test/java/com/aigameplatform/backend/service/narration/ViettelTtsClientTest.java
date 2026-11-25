package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ViettelTtsClientTest {
    private static final String ENDPOINT = "https://viettelai.vn/tts/speech_synthesis";

    @Test
    void requestsVietnameseMp3FromViettelAndValidatesTheResponse() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        byte[] mp3 = mp3Frame();
        server.expect(requestTo(ENDPOINT)).andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "text": "Chào em",
                          "voice": "hn-quynhanh",
                          "speed": 1.0,
                          "tts_return_option": 3,
                          "token": "viettel-test-token",
                          "without_filter": false
                        }
                        """))
                .andRespond(withSuccess(mp3, MediaType.valueOf("audio/mpeg")));

        var result = new ViettelTtsClient(builder, "viettel-test-token", new Mp3AudioValidator())
                .synthesizeVietnamese("Chào em");

        assertThat(result.audio()).isEqualTo(mp3);
        assertThat(result.durationSeconds()).isGreaterThan(0);
        server.verify();
    }

    @Test
    void rejectsMoreThanThreeHundredUnicodeCharactersBeforeCallingViettel() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ViettelTtsClient client = new ViettelTtsClient(builder, "viettel-test-token", new Mp3AudioValidator());

        assertThatThrownBy(() -> client.synthesizeVietnamese("a".repeat(301)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("300 Unicode characters");
        server.verify();
    }

    @Test
    void failsClearlyWhenTokenIsMissingBeforeCallingViettel() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ViettelTtsClient client = new ViettelTtsClient(builder, " ", new Mp3AudioValidator());

        assertThatThrownBy(() -> client.synthesizeVietnamese("Chào em"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("VIETTEL_TTS_TOKEN");
        server.verify();
    }

    @Test
    void rejectsSuccessfulHttpResponsesThatDoNotContainAnMp3() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(ENDPOINT)).andRespond(withSuccess("not an mp3", MediaType.TEXT_PLAIN));

        assertThatThrownBy(() -> new ViettelTtsClient(builder, "viettel-test-token", new Mp3AudioValidator())
                .synthesizeVietnamese("Chào em"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MP3");
        server.verify();
    }

    @Test
    void stopsReadingAnOversizedResponseAtOneBytePastTheFileLimit() {
        CountingInputStream body = new CountingInputStream(
                new byte[Mp3AudioValidator.MAX_FILE_BYTES * 4]);

        assertThatThrownBy(() -> ViettelTtsClient.readBoundedAudio(body))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256 KiB");
        assertThat(body.bytesRead()).isEqualTo(Mp3AudioValidator.MAX_FILE_BYTES + 1);
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

    private static byte[] mp3Frame() {
        byte[] frame = new byte[104];
        frame[0] = (byte) 0xFF;
        frame[1] = (byte) 0xF3;
        frame[2] = (byte) 0x40;
        return frame;
    }
}
