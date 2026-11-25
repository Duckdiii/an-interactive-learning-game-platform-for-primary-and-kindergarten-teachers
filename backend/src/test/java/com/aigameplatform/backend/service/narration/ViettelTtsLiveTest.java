package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.web.client.RestClient;

class ViettelTtsLiveTest {
    @Test
    @EnabledIfSystemProperty(named = "viettel.tts.live", matches = "true")
    void synthesizesVietnameseMp3WithTheRealViettelApi() {
        String token = System.getenv("VIETTEL_TTS_TOKEN");
        assertThat(token).isNotBlank();

        var audio = new ViettelTtsClient(RestClient.builder(), token, new Mp3AudioValidator())
                .synthesizeVietnamese("Xin chào các em, chúng ta cùng chơi nhé!");

        assertThat(audio.audio()).isNotEmpty();
        assertThat(audio.audio().length).isLessThanOrEqualTo(Mp3AudioValidator.MAX_FILE_BYTES);
        assertThat(audio.durationSeconds()).isPositive().isLessThanOrEqualTo(Mp3AudioValidator.MAX_DURATION_SECONDS);
    }
}
