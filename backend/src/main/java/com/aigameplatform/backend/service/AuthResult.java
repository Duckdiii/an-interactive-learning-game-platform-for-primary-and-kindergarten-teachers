package com.aigameplatform.backend.service;

import com.aigameplatform.backend.dto.response.AuthResponse;

/**
 * Kết quả đăng nhập/refresh: body trả cho client, refresh token để gắn vào cookie, và việc phiên có "ghi nhớ đăng
 * nhập" hay không (quyết định thời hạn cookie).
 */
public record AuthResult(AuthResponse response, String refreshToken, boolean rememberMe) {

    public AuthResult(AuthResponse response, String refreshToken) {
        this(response, refreshToken, false);
    }
}
