package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.dto.request.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        // Token do RefreshTokenCodec sinh ra dài 43 ký tự; giới hạn để không băm chuỗi tùy ý dài.
        @NotBlank(message = "Liên kết đặt lại mật khẩu không hợp lệ")
        @Size(max = 128, message = "Liên kết đặt lại mật khẩu không hợp lệ")
        String token,

        @StrongPassword
        String newPassword) {
}
