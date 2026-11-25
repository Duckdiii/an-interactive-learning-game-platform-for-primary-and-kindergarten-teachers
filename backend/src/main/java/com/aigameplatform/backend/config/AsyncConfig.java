package com.aigameplatform.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

// Bật @Async (dùng executor mặc định của Spring Boot), hiện cho SmtpPasswordResetMailer.
@Configuration
@EnableAsync
public class AsyncConfig {
}
