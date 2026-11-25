package com.aigameplatform.backend.service.narration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class NarrationConfiguration {
    @Bean
    RestClient.Builder narrationRestClientBuilder() {
        return RestClient.builder();
    }
}
