package com.aigameplatform.backend.config;

import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.controller.AuthController;
import com.aigameplatform.backend.controller.MediaController;
import com.aigameplatform.backend.controller.TeacherProfileController;
import com.aigameplatform.backend.dto.profile.TeacherProfileInput;
import com.aigameplatform.backend.service.profile.TeacherProfileService;
import com.aigameplatform.backend.dto.response.AuthResponse;
import com.aigameplatform.backend.dto.response.TeacherInfo;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.security.RefreshCookieFactory;
import com.aigameplatform.backend.security.RestSecurityErrorHandler;
import com.aigameplatform.backend.security.TeacherAccessAuthenticator;
import com.aigameplatform.backend.service.AuthResult;
import com.aigameplatform.backend.service.AuthService;
import com.aigameplatform.backend.service.PasswordResetService;
import com.aigameplatform.backend.service.media.LocalMediaStorageService;
import com.aigameplatform.backend.service.media.MediaUploadService;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({AuthController.class, MediaController.class, TeacherProfileController.class})
@Import({SecurityConfig.class, ClockConfig.class, JwtService.class, RefreshCookieFactory.class,
        RestSecurityErrorHandler.class, GlobalExceptionHandler.class, TeacherAccessAuthenticator.class})
@TestPropertySource(properties = {
        "app.jwt.secret=0123456789abcdef0123456789abcdef-test-secret",
        "app.jwt.access-token-ttl-minutes=15",
        "app.jwt.refresh-token-ttl-hours=24",
        "app.jwt.remember-me-refresh-token-ttl-days=30",
        "app.cors.allowed-origins=http://localhost:5173",
        "app.auth.refresh-cookie.name=refresh_token",
        "app.auth.refresh-cookie.path=/api/auth",
        "app.auth.refresh-cookie.same-site=Strict",
        "app.auth.refresh-cookie.secure=true"
})
class SecurityConfigTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef-test-secret";
    private static final String LOGIN_BODY = "{\"email\":\"a@school.edu.vn\",\"password\":\"Abcdef1!\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private PasswordResetService passwordResetService;

    @MockitoBean
    private MediaUploadService mediaUploads;

    @MockitoBean
    private LocalMediaStorageService mediaStorage;

    @MockitoBean
    private TeacherRepository teachers;

    @MockitoBean
    private TeacherProfileService profiles;

    @BeforeEach
    void activeAccounts() {
        when(teachers.existsByIdAndStatusAndSessionVersion("teacher-1", TeacherStatus.ACTIVE, 0)).thenReturn(true);
        when(teachers.existsByIdAndStatusAndSessionVersion("admin-1", TeacherStatus.ACTIVE, 0)).thenReturn(true);
    }

    @Test
    void uploadRequiresTeacherRoleAndPublicMediaAllowsCrossOriginReads() throws Exception {
        String admin = new JwtService(SECRET, 15, Clock.systemUTC())
                .generateAccessToken("admin-1", "admin@school.edu.vn", "session-admin", "ROLE_ADMIN");

        mockMvc.perform(multipart("/api/media/upload")).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/api/media/upload").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isForbidden());
        mockMvc.perform(options("/media/uploads/11111111-1111-1111-1111-111111111111.png")
                        .header(HttpHeaders.ORIGIN, "https://classroom.example.test")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"));
    }

    @Test
    void textSafetyRequiresTeacherRole() throws Exception {
        String admin = new JwtService(SECRET, 15, Clock.systemUTC())
                .generateAccessToken("admin-1", "admin@school.edu.vn", "session-admin", "ROLE_ADMIN");

        mockMvc.perform(post("/api/games/validate-text")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/games/validate-text").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacherProfileRequiresTeacherRoleAndUsesTokenIdentity() throws Exception {
        String admin = new JwtService(SECRET, 15, Clock.systemUTC())
                .generateAccessToken("admin-1", "admin@school.edu.vn", "session-admin", "ROLE_ADMIN");
        when(profiles.get("teacher-1")).thenReturn(new TeacherProfileInput("Hoa Mai", null, null, null, null));

        mockMvc.perform(get("/api/teacher/profile")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/teacher/profile").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/teacher/profile").header(HttpHeaders.AUTHORIZATION, "Bearer " + validAccessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.school").value("Hoa Mai"));
    }

    private static String validAccessToken() {
        return new JwtService(SECRET, 15, Clock.systemUTC())
                .generateAccessToken("teacher-1", "a@school.edu.vn", "session-1");
    }

    private static String expiredAccessToken() {
        Clock past = Clock.fixed(Instant.now().minusSeconds(3600), ZoneOffset.UTC);
        return new JwtService(SECRET, 15, past).generateAccessToken("teacher-1", "a@school.edu.vn", "session-1");
    }

    private static AuthResult authResult() {
        return new AuthResult(
                new AuthResponse("access-jwt", 900, new TeacherInfo("teacher-1", "Nguyễn Văn A", "a@school.edu.vn", UserRole.ROLE_TEACHER)),
                "raw-refresh-token", false, java.time.Duration.ofHours(24));
    }

    @Test
    void protectedEndpointWithoutTokenReturns401Envelope() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void unknownPathWithoutTokenReturns401InsteadOfLeakingWhichPathsExist() throws Exception {
        mockMvc.perform(get("/api/games"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void validAccessTokenReachesTheController() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + validAccessToken()))
                .andExpect(status().isNoContent());

        verify(authService).logout("session-1");
    }

    @Test
    void expiredAccessTokenReturns401() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredAccessToken()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void tamperedAccessTokenReturns401() throws Exception {
        String token = validAccessToken();
        String tampered = token.substring(0, token.length() - 3) + "abc";

        mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nonBearerAuthorizationHeaderReturns401() throws Exception {
        mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNz"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginIsPublic() throws Exception {
        when(authService.login(any())).thenReturn(authResult());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("access-jwt"));
    }

    @Test
    void forgotPasswordIsPublic() throws Exception {
        when(passwordResetService.forgotPassword("a@school.edu.vn")).thenReturn("ok");

        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@school.edu.vn\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void resetPasswordIsPublic() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"raw-token\",\"newPassword\":\"NewPass1!\"}"))
                .andExpect(status().isNoContent());

        verify(passwordResetService).resetPassword("raw-token", "NewPass1!");
    }

    @Test
    void loginIgnoresAnInvalidBearerToken() throws Exception {
        when(authService.login(any())).thenReturn(authResult());

        mockMvc.perform(post("/api/auth/login")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer garbage")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andExpect(status().isOk());
    }

    @Test
    void registerIsPublicAndStillValidatesTheBody() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"A\",\"email\":\"a@school.edu.vn\",\"password\":\"weak\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void refreshIsPublicAndReadsTheCookie() throws Exception {
        when(authService.refresh("old-refresh")).thenReturn(authResult());

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", "old-refresh")))
                .andExpect(status().isOk());
    }

    @Test
    void authenticatedRequestToUnknownPathReturns404Envelope() throws Exception {
        mockMvc.perform(get("/api/games").header(HttpHeaders.AUTHORIZATION, "Bearer " + validAccessToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void swaggerPathsAreNotBehindAuthentication() throws Exception {
        // Trong slice này springdoc có thể chưa nạp nên phản hồi là 404; điều cần kiểm là không phải 401.
        for (String path : new String[] {"/v3/api-docs", "/swagger-ui.html", "/swagger-ui/index.html"}) {
            mockMvc.perform(get(path)).andExpect(status().is(not(401)));
        }
    }

    @Test
    void swaggerPathsDoNotOpenUpOtherGetEndpoints() throws Exception {
        mockMvc.perform(get("/api/games")).andExpect(status().isUnauthorized());
    }

    @Test
    void corsPreflightFromTheFrontendIsAllowedWithCredentials() throws Exception {
        mockMvc.perform(options("/api/auth/refresh")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    void corsPreflightFromAnotherOriginIsRejected() throws Exception {
        mockMvc.perform(options("/api/auth/refresh")
                        .header(HttpHeaders.ORIGIN, "http://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }
}
