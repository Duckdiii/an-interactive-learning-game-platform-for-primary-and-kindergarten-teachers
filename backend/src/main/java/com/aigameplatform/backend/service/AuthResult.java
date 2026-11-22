package com.aigameplatform.backend.service;

import com.aigameplatform.backend.dto.response.AuthResponse;
import java.time.Duration;

/**
 * Kết quả đăng nhập/refresh: body trả cho client, refresh token để gắn vào cookie, việc phiên có "ghi nhớ đăng
 * nhập" hay không, và thời gian refresh token còn sống (cookie sống đúng bằng thời gian này).
 */
public record AuthResult(AuthResponse response, String refreshToken, boolean rememberMe, Duration refreshTtl) {
}
