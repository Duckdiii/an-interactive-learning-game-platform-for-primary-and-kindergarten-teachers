package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.response.AuthResponse;
import com.aigameplatform.backend.dto.response.RegisterResponse;
import com.aigameplatform.backend.dto.response.TeacherInfo;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.dto.request.LoginRequest;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.exception.LoginTemporarilyLockedException;
import com.aigameplatform.backend.exception.RateLimitedException;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.security.RefreshCookieFactory;
import com.aigameplatform.backend.service.AuthResult;
import com.aigameplatform.backend.service.AuthService;
import com.aigameplatform.backend.service.PasswordResetService;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private static final String VALID_REGISTER =
            "{\"fullName\":\"Nguyễn Văn A\",\"email\":\"a@school.edu.vn\",\"password\":\"Abcdef1!\"}";

    @Mock
    private AuthService authService;

    @Mock
    private PasswordResetService passwordResetService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        RefreshCookieFactory cookieFactory = new RefreshCookieFactory("refresh_token", "/api/auth", "Strict", true, 24, 30);
        mockMvc = MockMvcBuilders.standaloneSetup(new AuthController(authService, passwordResetService, cookieFactory))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static AuthResult authResult(String refreshToken) {
        return new AuthResult(
                new AuthResponse("access-jwt", 900, new TeacherInfo("teacher-1", "Nguyễn Văn A", "a@school.edu.vn")),
                refreshToken);
    }

    @Test
    void loginWithRememberMeSetsA30DayCookieAndPassesTheFlagThrough() throws Exception {
        AuthResult remembered = new AuthResult(authResult("raw").response(), "raw", true);
        when(authService.login(any())).thenReturn(remembered);

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\",\"password\":\"Abcdef1!\",\"rememberMe\":true}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=2592000")));
        verify(authService).login(org.mockito.ArgumentMatchers.argThat(LoginRequest::rememberMeOrDefault));
    }

    @Test
    void loginForALockedAccountReturns403AccountLocked() throws Exception {
        when(authService.login(any())).thenThrow(new ApiException(ErrorCode.ACCOUNT_LOCKED, "khóa"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\",\"password\":\"Abcdef1!\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void loginTemporarilyLockedReturns429WithRetryAfter() throws Exception {
        when(authService.login(any())).thenThrow(new LoginTemporarilyLockedException("khóa tạm", 840));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\",\"password\":\"Abcdef1!\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "840"))
                .andExpect(jsonPath("$.error.code").value("LOGIN_TEMPORARILY_LOCKED"));
    }

    @Test
    void registerReturns201WithEnvelope() throws Exception {
        when(authService.register(any())).thenReturn(new RegisterResponse("teacher-1", "a@school.edu.vn"));

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(VALID_REGISTER))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.teacherId").value("teacher-1"))
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void registerWithWeakPasswordReturnsValidationError() throws Exception {
        String body = "{\"fullName\":\"A\",\"email\":\"a@school.edu.vn\",\"password\":\"weak\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void registerWithMalformedJsonReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void loginSetsHttpOnlyRefreshCookieAndKeepsItOutOfTheBody() throws Exception {
        when(authService.login(any())).thenReturn(authResult("raw-refresh-token"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\",\"password\":\"Abcdef1!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("access-jwt"))
                .andExpect(jsonPath("$.data.expiresIn").value(900))
                .andExpect(jsonPath("$.data.teacher.email").value("a@school.edu.vn"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString("refresh_token=raw-refresh-token"),
                                org.hamcrest.Matchers.containsString("HttpOnly"),
                                org.hamcrest.Matchers.containsString("Secure"),
                                org.hamcrest.Matchers.containsString("Path=/api/auth"),
                                org.hamcrest.Matchers.containsString("SameSite=Strict"),
                                org.hamcrest.Matchers.containsString("Max-Age=86400"))));
    }

    @Test
    void wrongCredentialsReturn401Envelope() throws Exception {
        when(authService.login(any())).thenThrow(new ApiException(ErrorCode.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\",\"password\":\"x\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void refreshReadsTheTokenFromTheCookie() throws Exception {
        when(authService.refresh("old-refresh")).thenReturn(authResult("new-refresh"));

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", "old-refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("access-jwt"))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refresh_token=new-refresh")));
    }

    @Test
    void refreshWithoutCookieReturns401() throws Exception {
        when(authService.refresh(null)).thenThrow(new ApiException(ErrorCode.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ"));

        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void logoutRevokesTheSessionAndClearsTheCookie() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new AuthenticatedTeacher("teacher-1", "a@school.edu.vn", "session-1"), null, List.of()));

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));

        verify(authService).logout("session-1");
    }

    @Test
    void unexpectedErrorReturns500EnvelopeWithoutLeakingDetails() throws Exception {
        when(authService.login(any())).thenThrow(new IllegalStateException("db password is hunter2"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\",\"password\":\"x\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Lỗi hệ thống, vui lòng thử lại sau"));
    }

    @Test
    void forgotPasswordReturns200WithTheGenericMessage() throws Exception {
        when(passwordResetService.forgotPassword("lan@school.edu.vn")).thenReturn("Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.");

        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"lan@school.edu.vn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi."));
    }

    @Test
    void forgotPasswordWithInvalidEmailReturns400WithoutCallingTheService() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"khong-phai-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(passwordResetService);
    }

    @Test
    void forgotPasswordOverLimitReturns429WithRetryAfter() throws Exception {
        when(passwordResetService.forgotPassword(any())).thenThrow(new RateLimitedException("Bạn đã yêu cầu quá nhiều lần.", 1800));

        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"lan@school.edu.vn\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "1800"))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }

    @Test
    void resetPasswordReturns204() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"raw-token\",\"newPassword\":\"NewPass1!\"}"))
                .andExpect(status().isNoContent());
        verify(passwordResetService).resetPassword("raw-token", "NewPass1!");
    }

    @Test
    void resetPasswordWithWeakPasswordReturns400WithoutCallingTheService() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"raw-token\",\"newPassword\":\"yeu\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(passwordResetService);
    }

    @Test
    void resetPasswordWithExpiredLinkReturns400WithTheUcMessage() throws Exception {
        String message = "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại liên kết đặt lại mật khẩu.";
        doThrow(new ApiException(ErrorCode.VALIDATION_ERROR, message))
                .when(passwordResetService).resetPassword(any(), any());

        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"het-han\",\"newPassword\":\"NewPass1!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value(message));
    }
}
