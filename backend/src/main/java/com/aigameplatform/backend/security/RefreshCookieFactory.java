package com.aigameplatform.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Tạo và đọc cookie chứa refresh token (HttpOnly, Path=/api/auth, SameSite). */
@Component
public class RefreshCookieFactory {

    private final String name;
    private final String path;
    private final String sameSite;
    private final boolean secure;
    private final Duration maxAge;

    public RefreshCookieFactory(
            @Value("${app.auth.refresh-cookie.name}") String name,
            @Value("${app.auth.refresh-cookie.path}") String path,
            @Value("${app.auth.refresh-cookie.same-site}") String sameSite,
            @Value("${app.auth.refresh-cookie.secure}") boolean secure,
            @Value("${app.jwt.refresh-token-ttl-hours}") long refreshTtlHours) {
        this.name = name;
        this.path = path;
        this.sameSite = sameSite;
        this.secure = secure;
        this.maxAge = Duration.ofHours(refreshTtlHours);
    }

    public ResponseCookie create(String refreshToken) {
        return build(refreshToken, maxAge);
    }

    public ResponseCookie clear() {
        return build("", Duration.ZERO);
    }

    public Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private ResponseCookie build(String value, Duration age) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(age)
                .build();
    }
}
