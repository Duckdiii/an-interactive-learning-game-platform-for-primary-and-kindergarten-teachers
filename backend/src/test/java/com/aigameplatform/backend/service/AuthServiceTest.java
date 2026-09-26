package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.request.LoginRequest;
import com.aigameplatform.backend.dto.request.RegisterRequest;
import com.aigameplatform.backend.dto.response.RegisterResponse;
import com.aigameplatform.backend.entity.RefreshToken;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.security.RefreshTokenCodec;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-26T10:00:00Z");
    private static final String SECRET = "0123456789abcdef0123456789abcdef-test-secret";

    @Mock
    private TeacherRepository teacherRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final RefreshTokenCodec codec = new RefreshTokenCodec();

    private AuthService service;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        service = serviceAt(NOW);
    }

    private AuthService serviceAt(Instant instant) {
        Clock clock = Clock.fixed(instant, ZoneOffset.UTC);
        jwtService = new JwtService(SECRET, 15, clock);
        return new AuthService(teacherRepository, refreshTokenRepository, passwordEncoder, jwtService, codec, clock, 24);
    }

    private Teacher teacherWithPassword(String rawPassword) {
        Teacher teacher = new Teacher();
        teacher.setId("teacher-1");
        teacher.setFullName("Nguyễn Văn A");
        teacher.setEmail("a@school.edu.vn");
        teacher.setPasswordHash(passwordEncoder.encode(rawPassword));
        return teacher;
    }

    private RefreshToken storedToken(String raw, String familyId, LocalDateTime expiresAt, boolean revoked) {
        RefreshToken token = new RefreshToken();
        token.setTeacher(teacherWithPassword("Abcdef1!"));
        token.setTokenHash(codec.hash(raw));
        token.setFamilyId(familyId);
        token.setCreatedAt(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        token.setExpiresAt(expiresAt);
        if (revoked) {
            token.revoke(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        }
        return token;
    }

    private static LocalDateTime nowUtc() {
        return LocalDateTime.ofInstant(NOW, ZoneOffset.UTC);
    }

    // ---- register ----

    @Test
    void registerStoresHashedPasswordAndNormalizedEmail() {
        when(teacherRepository.existsByEmail("a@school.edu.vn")).thenReturn(false);
        when(teacherRepository.saveAndFlush(any(Teacher.class))).thenAnswer(inv -> {
            Teacher t = inv.getArgument(0);
            t.setId("teacher-1");
            return t;
        });

        RegisterResponse response = service.register(
                new RegisterRequest("  Nguyễn Văn A ", "  A@School.edu.VN ", "Abcdef1!"));

        ArgumentCaptor<Teacher> captor = ArgumentCaptor.forClass(Teacher.class);
        verify(teacherRepository).saveAndFlush(captor.capture());
        Teacher saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("a@school.edu.vn");
        assertThat(saved.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(saved.getPassword()).isNull();
        assertThat(saved.getPasswordHash()).isNotEqualTo("Abcdef1!");
        assertThat(passwordEncoder.matches("Abcdef1!", saved.getPasswordHash())).isTrue();
        assertThat(response.teacherId()).isEqualTo("teacher-1");
        assertThat(response.email()).isEqualTo("a@school.edu.vn");
    }

    @Test
    void registerRejectsExistingEmail() {
        when(teacherRepository.existsByEmail(anyString())).thenReturn(true);

        assertThatThrownBy(() -> service.register(new RegisterRequest("A", "a@school.edu.vn", "Abcdef1!")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        verify(teacherRepository, never()).saveAndFlush(any());
    }

    @Test
    void registerMapsUniqueConstraintRaceToValidationError() {
        when(teacherRepository.existsByEmail(anyString())).thenReturn(false);
        when(teacherRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> service.register(new RegisterRequest("A", "a@school.edu.vn", "Abcdef1!")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    // ---- login ----

    @Test
    void loginIssuesAccessTokenAndStoresOnlyTheRefreshTokenHash() {
        when(teacherRepository.findByEmail("a@school.edu.vn")).thenReturn(Optional.of(teacherWithPassword("Abcdef1!")));

        AuthResult result = service.login(new LoginRequest("A@school.edu.vn", "Abcdef1!"));

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        assertThat(saved.getTokenHash()).isEqualTo(codec.hash(result.refreshToken())).isNotEqualTo(result.refreshToken());
        assertThat(saved.getExpiresAt()).isEqualTo(nowUtc().plusHours(24));

        AuthenticatedTeacher claims = jwtService.parseAccessToken(result.response().accessToken());
        assertThat(claims.teacherId()).isEqualTo("teacher-1");
        assertThat(claims.sessionId()).isEqualTo(saved.getFamilyId());
        assertThat(result.response().expiresIn()).isEqualTo(900);
        assertThat(result.response().teacher().email()).isEqualTo("a@school.edu.vn");
    }

    @Test
    void loginRejectsWrongPassword() {
        when(teacherRepository.findByEmail(anyString())).thenReturn(Optional.of(teacherWithPassword("Abcdef1!")));

        assertThatThrownBy(() -> service.login(new LoginRequest("a@school.edu.vn", "Wrong123!")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void loginRejectsUnknownEmailWithTheSameError() {
        when(teacherRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("nobody@school.edu.vn", "Abcdef1!")))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
                    assertThat(e.getMessage()).isEqualTo("Email hoặc mật khẩu không đúng");
                });
    }

    // ---- refresh ----

    @Test
    void refreshRotatesTokenInTheSameFamily() {
        RefreshToken stored = storedToken("old-token", "family-1", nowUtc().plusHours(1), false);
        when(refreshTokenRepository.findByTokenHash(codec.hash("old-token"))).thenReturn(Optional.of(stored));

        AuthResult result = service.refresh("old-token");

        assertThat(stored.isRevoked()).isTrue();
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        assertThat(captor.getValue().getFamilyId()).isEqualTo("family-1");
        assertThat(result.refreshToken()).isNotEqualTo("old-token");
        assertThat(jwtService.parseAccessToken(result.response().accessToken()).sessionId()).isEqualTo("family-1");
    }

    @Test
    void refreshWithRevokedTokenRevokesTheWholeFamily() {
        RefreshToken stored = storedToken("used-token", "family-1", nowUtc().plusHours(1), true);
        when(refreshTokenRepository.findByTokenHash(codec.hash("used-token"))).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> service.refresh("used-token"))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));

        verify(refreshTokenRepository).revokeFamily("family-1", nowUtc());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void refreshRejectsExpiredToken() {
        RefreshToken stored = storedToken("old-token", "family-1", nowUtc().minusMinutes(1), false);
        when(refreshTokenRepository.findByTokenHash(codec.hash("old-token"))).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> service.refresh("old-token")).isInstanceOf(ApiException.class);

        assertThat(stored.isRevoked()).isFalse();
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void refreshRejectsUnknownToken() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refresh("unknown"))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }

    @Test
    void refreshRejectsMissingToken() {
        assertThatThrownBy(() -> service.refresh(null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.refresh("  ")).isInstanceOf(ApiException.class);
        verify(refreshTokenRepository, never()).findByTokenHash(anyString());
    }

    // ---- logout ----

    @Test
    void logoutRevokesTheSessionFamily() {
        service.logout("family-1");

        verify(refreshTokenRepository).revokeFamily("family-1", nowUtc());
    }
}
