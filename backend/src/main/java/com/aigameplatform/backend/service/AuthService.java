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
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.security.RefreshTokenCodec;
import java.time.Clock;
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

    private final TeacherRepository teacherRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenCodec refreshTokenCodec;
    private final Clock clock;
    private final long refreshTtlHours;
    // Dùng để tốn thời gian băm ngang nhau khi email không tồn tại, tránh dò email qua độ trễ.
    private final String dummyPasswordHash;

    public AuthService(
            TeacherRepository teacherRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenCodec refreshTokenCodec,
            Clock clock,
            @Value("${app.jwt.refresh-token-ttl-hours}") long refreshTtlHours) {
        this.teacherRepository = teacherRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenCodec = refreshTokenCodec;
        this.clock = clock;
        this.refreshTtlHours = refreshTtlHours;
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

    @Transactional
    public AuthResult login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Teacher teacher = teacherRepository.findByEmail(email).orElse(null);
        String hash = teacher != null ? teacher.getPasswordHash() : dummyPasswordHash;
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (teacher == null || !matches) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        return issueTokens(teacher, UUID.randomUUID().toString());
    }

    // noRollbackFor: khi phát hiện dùng lại token, việc thu hồi cả family phải được lưu dù ném lỗi.
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN);
        }
        LocalDateTime now = LocalDateTime.now(clock);
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(refreshTokenCodec.hash(rawRefreshToken))
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN));

        if (stored.isRevoked()) {
            refreshTokenRepository.revokeFamily(stored.getFamilyId(), now);
            log.warn("Refresh token đã bị thu hồi được dùng lại, thu hồi cả family {}", stored.getFamilyId());
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN);
        }
        if (stored.isExpired(now)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN);
        }

        stored.revoke(now);
        return issueTokens(stored.getTeacher(), stored.getFamilyId());
    }

    @Transactional
    public void logout(String sessionId) {
        refreshTokenRepository.revokeFamily(sessionId, LocalDateTime.now(clock));
    }

    private AuthResult issueTokens(Teacher teacher, String familyId) {
        LocalDateTime now = LocalDateTime.now(clock);
        String rawRefreshToken = refreshTokenCodec.generate();

        RefreshToken token = new RefreshToken();
        token.setTeacher(teacher);
        token.setTokenHash(refreshTokenCodec.hash(rawRefreshToken));
        token.setFamilyId(familyId);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusHours(refreshTtlHours));
        refreshTokenRepository.save(token);

        String accessToken = jwtService.generateAccessToken(teacher.getId(), teacher.getEmail(), familyId);
        AuthResponse response = new AuthResponse(
                accessToken,
                jwtService.getAccessTokenTtlSeconds(),
                new TeacherInfo(teacher.getId(), teacher.getFullName(), teacher.getEmail()));
        return new AuthResult(response, rawRefreshToken);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException emailAlreadyRegistered() {
        return new ApiException(ErrorCode.VALIDATION_ERROR, "Email đã được đăng ký");
    }
}
