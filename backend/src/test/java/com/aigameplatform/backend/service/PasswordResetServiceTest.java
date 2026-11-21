package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.PasswordResetToken;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.RateLimitedException;
import com.aigameplatform.backend.repository.PasswordResetTokenRepository;
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.RefreshTokenCodec;
import com.aigameplatform.backend.service.mail.PasswordResetMailer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-21T03:00:00Z");
    private static final LocalDateTime NOW_UTC = LocalDateTime.ofInstant(NOW, ZoneOffset.UTC);
    private static final String RESET_URL = "https://app.example/reset-password";

    @Mock
    private TeacherRepository teacherRepository;

    @Mock
    private PasswordResetTokenRepository resetTokenRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetRateLimiter rateLimiter;

    @Mock
    private PasswordResetMailer mailer;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final RefreshTokenCodec codec = new RefreshTokenCodec();

    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(teacherRepository, resetTokenRepository, refreshTokenRepository,
                passwordEncoder, codec, rateLimiter, mailer, Clock.fixed(NOW, ZoneOffset.UTC), RESET_URL);
    }

    private static Teacher teacher() {
        Teacher teacher = new Teacher();
        teacher.setId("teacher-1");
        teacher.setFullName("Nguyễn Thị Lan");
        teacher.setEmail("lan@school.edu.vn");
        teacher.setPasswordHash("old-hash");
        // Đang bị khóa tạm vì đăng nhập sai: đặt lại mật khẩu phải gỡ khóa và xóa bộ đếm.
        teacher.setFailedLoginAttempts(3);
        teacher.setLoginLockedUntil(NOW_UTC.plusMinutes(10));
        return teacher;
    }

    private PasswordResetToken storedToken(String raw, LocalDateTime expiresAt, LocalDateTime usedAt) {
        PasswordResetToken token = new PasswordResetToken();
        token.setTeacher(teacher());
        token.setTokenHash(codec.hash(raw));
        token.setCreatedAt(NOW_UTC.minusMinutes(5));
        token.setExpiresAt(expiresAt);
        token.setUsedAt(usedAt);
        return token;
    }

    @Test
    void forgotPasswordForExistingEmailStoresHashedTokenFor30MinutesAndMailsLinkWithRawToken() {
        when(teacherRepository.findByEmail("lan@school.edu.vn")).thenReturn(Optional.of(teacher()));

        String message = service.forgotPassword("lan@school.edu.vn");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokenRepository).save(saved.capture());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailer).sendResetLink(org.mockito.ArgumentMatchers.eq("lan@school.edu.vn"),
                org.mockito.ArgumentMatchers.eq("Nguyễn Thị Lan"), link.capture());

        assertThat(link.getValue()).startsWith(RESET_URL + "?token=");
        String rawToken = link.getValue().substring((RESET_URL + "?token=").length());
        // Chỉ bản băm nằm trong DB, không phải token gốc.
        assertThat(saved.getValue().getTokenHash()).isEqualTo(codec.hash(rawToken)).isNotEqualTo(rawToken);
        assertThat(saved.getValue().getExpiresAt()).isEqualTo(NOW_UTC.plusMinutes(30));
        assertThat(saved.getValue().getUsedAt()).isNull();
        assertThat(message).isEqualTo(PasswordResetService.ACCEPTED_MESSAGE);
    }

    @Test
    void forgotPasswordForUnknownEmailReturnsSameMessageWithoutTokenOrMail() {
        when(teacherRepository.findByEmail("khong-co@school.edu.vn")).thenReturn(Optional.empty());

        String message = service.forgotPassword("khong-co@school.edu.vn");

        assertThat(message).isEqualTo(PasswordResetService.ACCEPTED_MESSAGE);
        verify(resetTokenRepository, never()).save(any());
        verifyNoInteractions(mailer);
    }

    @Test
    void forgotPasswordNormalizesEmailForRateLimitAndLookup() {
        when(teacherRepository.findByEmail("lan@school.edu.vn")).thenReturn(Optional.empty());

        service.forgotPassword("  Lan@School.EDU.vn ");

        verify(rateLimiter).acquire("lan@school.edu.vn");
        verify(teacherRepository).findByEmail("lan@school.edu.vn");
    }

    @Test
    void forgotPasswordOverLimitIsRejectedBeforeLookingUpTheAccount() {
        doThrow(new RateLimitedException("quá nhiều", 120)).when(rateLimiter).acquire("lan@school.edu.vn");

        assertThatThrownBy(() -> service.forgotPassword("lan@school.edu.vn"))
                .isInstanceOf(RateLimitedException.class);
        verifyNoInteractions(teacherRepository, mailer);
    }

    @Test
    void forgotPasswordInsideATransactionMailsOnlyAfterCommit() {
        when(teacherRepository.findByEmail("lan@school.edu.vn")).thenReturn(Optional.of(teacher()));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.forgotPassword("lan@school.edu.vn");

            // Token chưa commit: chưa được gửi thư.
            verifyNoInteractions(mailer);

            TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
            verify(mailer).sendResetLink(org.mockito.ArgumentMatchers.eq("lan@school.edu.vn"),
                    org.mockito.ArgumentMatchers.eq("Nguyễn Thị Lan"), anyString());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void resetPasswordWithValidLinkChangesPasswordUsesLinkAndLogsOutEverySession() {
        PasswordResetToken token = storedToken("raw-token", NOW_UTC.plusMinutes(10), null);
        when(resetTokenRepository.findByTokenHash(codec.hash("raw-token"))).thenReturn(Optional.of(token));
        when(refreshTokenRepository.findActiveFamilyIds("teacher-1")).thenReturn(List.of("family-a", "family-b"));

        service.resetPassword("raw-token", "NewPass1!");

        assertThat(passwordEncoder.matches("NewPass1!", token.getTeacher().getPasswordHash())).isTrue();
        assertThat(token.getTeacher().getLoginLockedUntil()).isNull();
        assertThat(token.getTeacher().getFailedLoginAttempts()).isZero();
        assertThat(token.getUsedAt()).isEqualTo(NOW_UTC);
        verify(resetTokenRepository).markAllUnusedAsUsed("teacher-1", NOW_UTC);
        // Khóa family trước rồi mới thu hồi, cùng thứ tự với refresh()/logout().
        InOrder order = inOrder(refreshTokenRepository);
        order.verify(refreshTokenRepository).lockFamily("family-a");
        order.verify(refreshTokenRepository).revokeFamily("family-a", NOW_UTC);
        order.verify(refreshTokenRepository).lockFamily("family-b");
        order.verify(refreshTokenRepository).revokeFamily("family-b", NOW_UTC);
    }

    @Test
    void resetPasswordWithUnknownLinkIsRejected() {
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertInvalidLink("khong-ton-tai");
    }

    @Test
    void resetPasswordWithExpiredLinkIsRejected() {
        PasswordResetToken token = storedToken("raw-token", NOW_UTC, null);
        when(resetTokenRepository.findByTokenHash(codec.hash("raw-token"))).thenReturn(Optional.of(token));

        assertInvalidLink("raw-token");
        assertThat(token.getTeacher().getPasswordHash()).isEqualTo("old-hash");
    }

    @Test
    void resetPasswordWithAlreadyUsedLinkIsRejected() {
        PasswordResetToken token = storedToken("raw-token", NOW_UTC.plusMinutes(10), NOW_UTC.minusMinutes(1));
        when(resetTokenRepository.findByTokenHash(codec.hash("raw-token"))).thenReturn(Optional.of(token));

        assertInvalidLink("raw-token");
        assertThat(token.getTeacher().getPasswordHash()).isEqualTo("old-hash");
    }

    private void assertInvalidLink(String rawToken) {
        assertThatThrownBy(() -> service.resetPassword(rawToken, "NewPass1!"))
                .isInstanceOf(ApiException.class)
                .hasMessage(PasswordResetService.INVALID_LINK_MESSAGE)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
        verify(refreshTokenRepository, never()).revokeFamily(anyString(), any());
        verify(resetTokenRepository, never()).markAllUnusedAsUsed(anyString(), any());
    }
}
