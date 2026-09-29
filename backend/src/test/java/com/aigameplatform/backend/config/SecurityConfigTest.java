package com.aigameplatform.backend.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.controller.AuthController;
import com.aigameplatform.backend.dto.response.AuthResponse;
import com.aigameplatform.backend.dto.response.TeacherInfo;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.security.RefreshCookieFactory;
import com.aigameplatform.backend.security.RestSecurityErrorHandler;
import com.aigameplatform.backend.service.AuthResult;
import com.aigameplatform.backend.service.AuthService;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, ClockConfig.class, JwtService.class, RefreshCookieFactory.class,
        RestSecurityErrorHandler.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = {
        "app.jwt.secret=0123456789abcdef0123456789abcdef-test-secret",
        "app.jwt.access-token-ttl-minutes=15",
        "app.jwt.refresh-token-ttl-hours=24",
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
                new AuthResponse("access-jwt", 900, new TeacherInfo("teacher-1", "Nguyễn Văn A", "a@school.edu.vn")),
                "raw-refresh-token");
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
