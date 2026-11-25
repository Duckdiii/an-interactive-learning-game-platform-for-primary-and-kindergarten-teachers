package com.aigameplatform.backend.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/** Gửi thư qua SMTP (cấu hình {@code spring.mail.*} từ biến môi trường MAIL_*). */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpPasswordResetMailer implements PasswordResetMailer {

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpPasswordResetMailer(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    // @Async: gửi SMTP mất cả giây; nếu chạy đồng bộ, email có tồn tại sẽ phản hồi chậm hơn hẳn email không tồn tại,
    // để lộ tài khoản qua độ trễ. Lỗi gửi chỉ ghi log (không kèm liên kết) vì response đã trả về giống nhau.
    @Async
    @Override
    public void sendResetLink(String toEmail, String fullName, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject("Đặt lại mật khẩu AI Game Platform");
        message.setText("""
                Chào %s,

                Có yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết dưới đây để đặt mật khẩu mới \
                (liên kết dùng được một lần và hết hạn sau 30 phút):

                %s

                Nếu bạn không yêu cầu, hãy bỏ qua thư này; mật khẩu hiện tại vẫn giữ nguyên.
                """.formatted(fullName, resetLink));
        try {
            mailSender.send(message);
        } catch (RuntimeException e) {
            // Bắt mọi lỗi runtime (không chỉ MailException): chạy @Async nên không ai ở phía gọi nhận được lỗi này.
            log.error("Không gửi được thư đặt lại mật khẩu tới {}", toEmail, e);
        }
    }
}
