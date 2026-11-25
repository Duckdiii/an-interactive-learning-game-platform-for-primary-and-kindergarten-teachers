package com.aigameplatform.backend.service.narration;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class ElevenLabsTtsConfiguration {
    @Bean("elevenLabsRestClientBuilder")
    RestClient.Builder elevenLabsRestClientBuilder(
            @Value("${app.narration.elevenlabs.connect-timeout-seconds:5}") int connectTimeoutSeconds,
            @Value("${app.narration.elevenlabs.read-timeout-seconds:25}") int readTimeoutSeconds) {
        if (connectTimeoutSeconds < 1 || readTimeoutSeconds < 1)
            throw new IllegalArgumentException("ElevenLabs TTS timeouts must be positive");
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(connectTimeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));
        return RestClient.builder().requestFactory(requestFactory);
    }
}
