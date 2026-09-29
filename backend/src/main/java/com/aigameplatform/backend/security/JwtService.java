package com.aigameplatform.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_EMAIL = "email";
    // "sid" = mã phiên đăng nhập (family của refresh token), dùng để logout thu hồi đúng phiên.
    private static final String CLAIM_SESSION_ID = "sid";

    private final SecretKey key;
    private final Duration accessTokenTtl;
    private final Clock clock;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes,
            Clock clock) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET phải dài ít nhất " + MIN_SECRET_BYTES + " byte");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.accessTokenTtl = Duration.ofMinutes(accessTokenTtlMinutes);
        this.clock = clock;
    }

    public String generateAccessToken(String teacherId, String email, String sessionId) {
        Instant now = clock.instant();
        return Jwts.builder()
                .subject(teacherId)
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_SESSION_ID, sessionId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** @throws JwtException nếu token sai chữ ký, sai định dạng hoặc đã hết hạn. */
    public AuthenticatedTeacher parseAccessToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new AuthenticatedTeacher(
                claims.getSubject(),
                claims.get(CLAIM_EMAIL, String.class),
                claims.get(CLAIM_SESSION_ID, String.class));
    }

    public long getAccessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }
}
