package com.aigameplatform.backend.config;

import java.util.Random;
import java.util.random.RandomGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RandomConfig {

    /** Nguồn ngẫu nhiên dùng để xáo trộn nội dung game; test thay bằng bản có hạt giống cố định. */
    @Bean
    public RandomGenerator randomGenerator() {
        return new Random();
    }
}
