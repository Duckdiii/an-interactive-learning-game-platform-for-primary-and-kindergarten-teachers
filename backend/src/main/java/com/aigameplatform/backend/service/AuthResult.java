package com.aigameplatform.backend.service;

import com.aigameplatform.backend.dto.response.AuthResponse;

/** Kết quả đăng nhập/refresh: body trả cho client và refresh token để gắn vào cookie. */
public record AuthResult(AuthResponse response, String refreshToken) {
}
