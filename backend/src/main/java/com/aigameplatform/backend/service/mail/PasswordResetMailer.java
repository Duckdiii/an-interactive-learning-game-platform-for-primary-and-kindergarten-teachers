package com.aigameplatform.backend.service.mail;

/** Gửi liên kết đặt lại mật khẩu cho giáo viên. Bản cài đặt chọn theo {@code app.mail.enabled}. */
public interface PasswordResetMailer {

    void sendResetLink(String toEmail, String fullName, String resetLink);
}
