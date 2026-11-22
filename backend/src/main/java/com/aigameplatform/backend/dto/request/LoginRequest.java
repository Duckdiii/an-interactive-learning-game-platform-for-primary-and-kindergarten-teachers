package com.aigameplatform.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email không được để trống") String email,
        @NotBlank(message = "Mật khẩu không được để trống") String password,
        // Không bắt buộc (mặc định false): kéo dài refresh token và cookie lên 30 ngày.
        Boolean rememberMe) {

    public LoginRequest(String email, String password) {
        this(email, password, null);
    }

    public boolean rememberMeOrDefault() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
