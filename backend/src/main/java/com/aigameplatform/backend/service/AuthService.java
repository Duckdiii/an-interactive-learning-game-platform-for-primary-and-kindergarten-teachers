package com.aigameplatform.backend.service;

import com.aigameplatform.backend.dto.request.LoginRequest;
import com.aigameplatform.backend.dto.request.RegisterRequest;
import com.aigameplatform.backend.dto.response.AuthResponse;
import com.aigameplatform.backend.dto.response.RegisterResponse;
import com.aigameplatform.backend.dto.response.TeacherInfo;
import com.aigameplatform.backend.entity.RefreshToken;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.LoginTemporarilyLockedException;
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.security.RefreshTokenCodec;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng";
    private static final String INVALID_REFRESH_TOKEN = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn";
    // Câu thông báo theo UC-15 luồng 4b, 4c.
    static final String ACCOUNT_LOCKED =
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.";
    static final String LOGIN_TEMPORARILY_LOCKED =
            "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.";
    static final int MAX_FAILED_LOGINS = 5;
    static final Duration LOGIN_LOCK_DURATION = Duration.ofMinutes(15);

    private final TeacherRepository teacherRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenCodec refreshTokenCodec;
    private final Clock clock;
    private final long refreshTtlHours;
    private final long rememberMeTtlDays;
    // Dùng để tốn thời gian băm ngang nhau khi email không tồn tại, tránh dò email qua độ trễ.
    private final String dummyPasswordHash;

    public AuthService(
            TeacherRepository teacherRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenCodec refreshTokenCodec,
            Clock clock,
            @Value("${app.jwt.refresh-token-ttl-hours}") long refreshTtlHours,
            @Value("${app.jwt.remember-me-refresh-token-ttl-days}") long rememberMeTtlDays) {
        this.teacherRepository = teacherRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenCodec = refreshTokenCodec;
        this.clock = clock;
        this.refreshTtlHours = refreshTtlHours;
        this.rememberMeTtlDays = rememberMeTtlDays;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (teacherRepository.existsByEmail(email)) {
            throw emailAlreadyRegistered();
        }
        Teacher teacher = new Teacher();
        teacher.setFullName(request.fullName().trim());
        teacher.setEmail(email);
        teacher.setPasswordHash(passwordEncoder.encode(request.password()));
        try {
            teacher = teacherRepository.saveAndFlush(teacher);
        } catch (DataIntegrityViolationException e) {
            // Hai request đăng ký cùng email chạy đồng thời: ràng buộc unique chặn request sau.
            throw emailAlreadyRegistered();
        }
        return new RegisterResponse(teacher.getId(), teacher.getEmail());
    }

    // noRollbackFor: bộ đếm đăng nhập sai (và khóa tạm) phải được lưu dù request kết thúc bằng lỗi 401.
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResult login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        // Không khóa dòng giáo viên ở đây: giữ khóa suốt lúc băm bcrypt thì vài trăm request vào cùng một email sẽ
        // chiếm hết pool kết nối (5) và treo cả hệ thống. Bộ đếm sai được cộng bằng một câu UPDATE nguyên tử bên dưới.
        Teacher teacher = teacherRepository.findByEmail(email).orElse(null);
        LocalDateTime now = LocalDateTime.now(clock);
        // Luôn băm trước khi xét khóa tạm, để tài khoản đang khóa không trả lời nhanh hơn hẳn (lộ trạng thái qua độ trễ).
        String hash = teacher != null ? teacher.getPasswordHash() : dummyPasswordHash;
        boolean matches = passwordEncoder.matches(request.password(), hash);

        if (teacher != null && teacher.isLoginTemporarilyLocked(now)) {
            long retryAfter = Math.max(1, Duration.between(now, teacher.getLoginLockedUntil()).toSeconds());
            throw new LoginTemporarilyLockedException(LOGIN_TEMPORARILY_LOCKED, retryAfter);
        }
        if (teacher == null || !matches) {
            if (teacher != null) {
                teacherRepository.registerFailedLogin(
                        teacher.getId(), MAX_FAILED_LOGINS, now.plus(LOGIN_LOCK_DURATION));
            }
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        // Chỉ báo bị khóa khi mật khẩu đúng: báo sớm hơn thì ai cũng dò được email nào đang bị khóa.
        if (teacher.isLocked()) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED, ACCOUNT_LOCKED);
        }
        teacher.resetLoginFailures();
        return issueTokens(teacher, UUID.randomUUID().toString(), request.rememberMeOrDefault());
    }

    // noRollbackFor: khi phát hiện dùng lại token, việc thu hồi cả family phải được lưu dù ném lỗi.
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN);
        }
        String tokenHash = refreshTokenCodec.hash(rawRefreshToken);
        // Đọc familyId bằng truy vấn không khóa dòng: khóa dòng ở bước này rồi mới chờ lockFamily(...) có thể
        // deadlock với logout() (khóa family trước, rồi mới cần khóa dòng khi chạy revokeFamily).
        String familyId = refreshTokenRepository.findFamilyIdByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN));
        // Khóa cả family trong suốt giao dịch: một request xoay vòng hợp lệ khác, hoặc một request khác phát
        // hiện dùng lại token của cùng family, phải đợi giao dịch này commit trước khi đọc/sửa tiếp. Nếu không,
        // token mới có thể được tạo ra ngay sau khi family vừa bị coi là lộ và bị thu hồi toàn bộ.
        refreshTokenRepository.lockFamily(familyId);

        LocalDateTime now = LocalDateTime.now(clock);
        // Đọc lại sau khi có khóa: trạng thái có thể đã đổi trong lúc chờ khóa.
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN));

        if (stored.isRevoked()) {
            refreshTokenRepository.revokeFamily(stored.getFamilyId(), now);
            log.warn("Refresh token đã bị thu hồi được dùng lại, thu hồi cả family {}", stored.getFamilyId());
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN);
        }
        if (stored.isExpired(now)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN);
        }

        Teacher teacher = stored.getTeacher();
        if (teacher.isLocked()) {
            // Tài khoản vừa bị khóa: kết thúc luôn phiên này thay vì để nó tiếp tục xoay vòng.
            refreshTokenRepository.revokeFamily(stored.getFamilyId(), now);
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED, ACCOUNT_LOCKED);
        }

        stored.revoke(now);
        // "Ghi nhớ đăng nhập" có hạn tuyệt đối 30 ngày tính từ lúc đăng nhập: xoay vòng giữ nguyên hạn cũ, không gia
        // hạn tiếp, để một máy dùng chung còn cookie không giữ phiên của giáo viên mãi mãi.
        return stored.isRememberMe()
                ? issueTokens(teacher, stored.getFamilyId(), true, stored.getExpiresAt())
                : issueTokens(teacher, stored.getFamilyId(), false);
    }

    @Transactional
    public void logout(String sessionId) {
        // Cùng lý do với refresh(): khóa family trước khi thu hồi, để không có token nào đang được tạo ra
        // (bởi một refresh() khác của cùng family) lọt qua sau khi logout() đã quét xong.
        refreshTokenRepository.lockFamily(sessionId);
        refreshTokenRepository.revokeFamily(sessionId, LocalDateTime.now(clock));
    }

    private AuthResult issueTokens(Teacher teacher, String familyId, boolean rememberMe) {
        LocalDateTime now = LocalDateTime.now(clock);
        return issueTokens(teacher, familyId, rememberMe,
                rememberMe ? now.plusDays(rememberMeTtlDays) : now.plusHours(refreshTtlHours));
    }

    private AuthResult issueTokens(Teacher teacher, String familyId, boolean rememberMe, LocalDateTime expiresAt) {
        LocalDateTime now = LocalDateTime.now(clock);
        String rawRefreshToken = refreshTokenCodec.generate();

        RefreshToken token = new RefreshToken();
        token.setTeacher(teacher);
        token.setTokenHash(refreshTokenCodec.hash(rawRefreshToken));
        token.setFamilyId(familyId);
        token.setCreatedAt(now);
        token.setRememberMe(rememberMe);
        token.setExpiresAt(expiresAt);
        refreshTokenRepository.save(token);

        String accessToken = jwtService.generateAccessToken(teacher.getId(), teacher.getEmail(), familyId);
        AuthResponse response = new AuthResponse(
                accessToken,
                jwtService.getAccessTokenTtlSeconds(),
                new TeacherInfo(teacher.getId(), teacher.getFullName(), teacher.getEmail()));
        return new AuthResult(response, rawRefreshToken, rememberMe);
    }

    // Dùng chung với PasswordResetService để email được so khớp giống hệt lúc đăng ký/đăng nhập.
    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException emailAlreadyRegistered() {
        return new ApiException(ErrorCode.VALIDATION_ERROR, "Email đã được đăng ký");
    }
}
