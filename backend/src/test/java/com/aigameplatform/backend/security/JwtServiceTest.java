package com.aigameplatform.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.JwtException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef-test-secret";
    private static final Instant NOW = Instant.parse("2026-09-26T10:00:00Z");

    private static JwtService serviceAt(Instant instant, String secret) {
        return new JwtService(secret, 15, Clock.fixed(instant, ZoneOffset.UTC));
    }

    @Test
    void parsesTokenItIssued() {
        JwtService service = serviceAt(NOW, SECRET);

        String token = service.generateAccessToken("teacher-1", "a@school.edu.vn", "session-1");
        AuthenticatedTeacher teacher = service.parseAccessToken(token);

        assertThat(teacher.teacherId()).isEqualTo("teacher-1");
        assertThat(teacher.email()).isEqualTo("a@school.edu.vn");
        assertThat(teacher.sessionId()).isEqualTo("session-1");
    }

    @Test
    void acceptsTokenJustBeforeExpiry() {
        String token = serviceAt(NOW, SECRET).generateAccessToken("t", "e@x.vn", "s");

        JwtService later = serviceAt(NOW.plusSeconds(14 * 60), SECRET);

        assertThat(later.parseAccessToken(token).teacherId()).isEqualTo("t");
    }

    @Test
    void rejectsExpiredToken() {
        String token = serviceAt(NOW, SECRET).generateAccessToken("t", "e@x.vn", "s");

        JwtService later = serviceAt(NOW.plusSeconds(16 * 60), SECRET);

        assertThatThrownBy(() -> later.parseAccessToken(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        String token = serviceAt(NOW, "another-secret-another-secret-another-secret")
                .generateAccessToken("t", "e@x.vn", "s");

        assertThatThrownBy(() -> serviceAt(NOW, SECRET).parseAccessToken(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTamperedToken() {
        JwtService service = serviceAt(NOW, SECRET);
        String token = service.generateAccessToken("t", "e@x.vn", "s");
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "B" : "A") + "x";

        assertThatThrownBy(() -> service.parseAccessToken(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsMalformedToken() {
        JwtService service = serviceAt(NOW, SECRET);

        assertThatThrownBy(() -> service.parseAccessToken("not-a-jwt")).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsSecretShorterThan32Bytes() {
        assertThatThrownBy(() -> serviceAt(NOW, "too-short"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void reportsAccessTokenTtlInSeconds() {
        assertThat(serviceAt(NOW, SECRET).getAccessTokenTtlSeconds()).isEqualTo(900);
    }
}
