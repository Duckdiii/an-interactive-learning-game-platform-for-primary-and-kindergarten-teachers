package com.aigameplatform.backend.service.media;

import com.google.cloud.texttospeech.v1.TextToSpeechClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TtsConfiguration {
    private static final Logger log = LoggerFactory.getLogger(TtsConfiguration.class);

    @Bean
    @ConditionalOnProperty(name = "gcp.tts.enabled", havingValue = "true")
    public TextToSpeechClient textToSpeechClient() {
        try {
            return TextToSpeechClient.create();
        } catch (Exception e) {
            log.warn("Failed to create Google TextToSpeechClient: {}", e.getMessage());
            throw new IllegalStateException("Cannot initialize Google Cloud TextToSpeechClient", e);
        }
    }

    @Bean
    @ConditionalOnProperty(name = "gcp.tts.enabled", havingValue = "true")
    public TtsService googleCloudTtsService(TextToSpeechClient ttsClient) {
        return new GoogleCloudTtsService(ttsClient);
    }

    @Bean
    @ConditionalOnProperty(name = "gcp.tts.enabled", havingValue = "false", matchIfMissing = true)
    public TtsService mockTtsService() {
        return new MockTtsService();
    }
}
