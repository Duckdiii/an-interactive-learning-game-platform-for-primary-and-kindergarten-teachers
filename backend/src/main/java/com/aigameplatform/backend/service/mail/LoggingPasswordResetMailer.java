package com.aigameplatform.backend.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Chỉ dùng khi chạy ở máy dev (chưa cấu hình SMTP): in liên kết ra log thay vì gửi thư. Liên kết này cho phép đổi
 * mật khẩu, nên profile prod bật {@code app.mail.enabled=true} để bản này không bao giờ chạy khi triển khai thật.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class LoggingPasswordResetMailer implements PasswordResetMailer {

    @Override
    public void sendResetLink(String toEmail, String fullName, String resetLink) {
        log.warn("[DEV] Chưa bật gửi email (app.mail.enabled=false). Liên kết đặt lại mật khẩu cho {}: {}", toEmail, resetLink);
    }
}
