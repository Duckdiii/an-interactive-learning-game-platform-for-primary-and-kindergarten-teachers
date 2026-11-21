package com.aigameplatform.backend.service;

import com.aigameplatform.backend.entity.PasswordResetToken;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.PasswordResetTokenRepository;
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.RefreshTokenCodec;
import com.aigameplatform.backend.service.mail.PasswordResetMailer;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Quên mật khẩu / đặt lại mật khẩu bằng liên kết gửi qua email (UC-15 luồng 2a, 2b). */
@Service
public class PasswordResetService {

    static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    static final String ACCEPTED_MESSAGE = "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.";
    static final String INVALID_LINK_MESSAGE =
            "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại liên kết đặt lại mật khẩu.";

    private final TeacherRepository teacherRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    // Cùng cách sinh/băm với refresh token: chuỗi ngẫu nhiên 256 bit, lưu SHA-256.
    private final RefreshTokenCodec tokenCodec;
    private final PasswordResetRateLimiter rateLimiter;
    private final PasswordResetMailer mailer;
    private final Clock clock;
    private final String resetPasswordUrl;

    public PasswordResetService(
            TeacherRepository teacherRepository,
            PasswordResetTokenRepository resetTokenRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            RefreshTokenCodec tokenCodec,
            PasswordResetRateLimiter rateLimiter,
            PasswordResetMailer mailer,
            Clock clock,
            @Value("${app.auth.password-reset.url}") String resetPasswordUrl) {
        this.teacherRepository = teacherRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenCodec = tokenCodec;
        this.rateLimiter = rateLimiter;
        this.mailer = mailer;
        this.clock = clock;
        this.resetPasswordUrl = resetPasswordUrl;
    }

    /** Luôn trả cùng một thông điệp, dù email có tồn tại hay không (tránh dò tài khoản). */
    @Transactional
    public String forgotPassword(String email) {
        String normalizedEmail = AuthService.normalizeEmail(email);
        rateLimiter.acquire(normalizedEmail);
        teacherRepository.findByEmail(normalizedEmail).ifPresent(this::issueAndSend);
        return ACCEPTED_MESSAGE;
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        LocalDateTime now = LocalDateTime.now(clock);
        PasswordResetToken token = resetTokenRepository.findByTokenHash(tokenCodec.hash(rawToken))
                .filter(candidate -> candidate.isUsable(now))
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_ERROR, INVALID_LINK_MESSAGE));

        Teacher teacher = token.getTeacher();
        teacher.setPasswordHash(passwordEncoder.encode(newPassword));
        token.markUsed(now);
        resetTokenRepository.markAllUnusedAsUsed(teacher.getId(), now);
        revokeAllSessions(teacher.getId(), now);
    }

    // Khóa từng family như refresh()/logout() rồi mới thu hồi: một refresh() đang xoay vòng đúng lúc này giữ khóa
    // family, nên ta chờ nó commit rồi thu hồi luôn token mới nó vừa tạo; nếu thu hồi bằng một câu UPDATE không khóa,
    // token mới đó (chưa commit nên câu UPDATE không thấy) sẽ sống tiếp dù giáo viên vừa đặt lại mật khẩu.
    private void revokeAllSessions(String teacherId, LocalDateTime now) {
        for (String familyId : refreshTokenRepository.findActiveFamilyIds(teacherId)) {
            refreshTokenRepository.lockFamily(familyId);
            refreshTokenRepository.revokeFamily(familyId, now);
        }
    }

    private void issueAndSend(Teacher teacher) {
        LocalDateTime now = LocalDateTime.now(clock);
        String rawToken = tokenCodec.generate();

        PasswordResetToken token = new PasswordResetToken();
        token.setTeacher(teacher);
        token.setTokenHash(tokenCodec.hash(rawToken));
        token.setCreatedAt(now);
        token.setExpiresAt(now.plus(TOKEN_TTL));
        resetTokenRepository.save(token);

        // Token dạng Base64 URL-safe không padding nên ghép thẳng vào query mà không cần mã hóa thêm.
        String link = resetPasswordUrl + "?token=" + rawToken;
        String email = teacher.getEmail();
        String fullName = teacher.getFullName();
        afterCommit(() -> mailer.sendResetLink(email, fullName, link));
    }

    // Chỉ gửi thư khi token đã nằm trong DB: gửi trước commit thì giáo viên bấm liên kết sớm sẽ gặp "không hợp lệ",
    // còn nếu giao dịch rollback thì thư mang một liên kết không bao giờ dùng được.
    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
