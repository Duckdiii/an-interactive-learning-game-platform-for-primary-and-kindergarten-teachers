package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.LoginRequest;
import com.aigameplatform.backend.dto.request.RegisterRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.response.AuthResponse;
import com.aigameplatform.backend.dto.response.RegisterResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.security.RefreshCookieFactory;
import com.aigameplatform.backend.service.AuthResult;
import com.aigameplatform.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshCookieFactory refreshCookieFactory;

    public AuthController(AuthService authService, RefreshCookieFactory refreshCookieFactory) {
        this.authService = authService;
        this.refreshCookieFactory = refreshCookieFactory;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return withRefreshCookie(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(HttpServletRequest request) {
        String refreshToken = refreshCookieFactory.read(request).orElse(null);
        return withRefreshCookie(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        authService.logout(teacher.sessionId());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.clear().toString())
                .build();
    }

    private ResponseEntity<ApiResponse<AuthResponse>> withRefreshCookie(AuthResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.create(result.refreshToken()).toString())
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(result.response()));
    }
}
