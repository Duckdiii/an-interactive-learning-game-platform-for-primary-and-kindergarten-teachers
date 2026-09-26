package com.aigameplatform.backend.security;

import com.aigameplatform.backend.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Trả 401/403 từ tầng Security theo đúng envelope lỗi của contract. */
@Component
public class RestSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private static final String UNAUTHORIZED_MESSAGE = "Thiếu hoặc hết hạn access token";
    private static final String FORBIDDEN_MESSAGE = "Bạn không có quyền thực hiện thao tác này";

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        write(response, ErrorCode.UNAUTHORIZED, UNAUTHORIZED_MESSAGE);
    }

    @Override
    public void handle(
            HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException {
        write(response, ErrorCode.FORBIDDEN, FORBIDDEN_MESSAGE);
    }

    // Thông báo là hằng số không chứa ký tự cần escape, nên ghép chuỗi JSON trực tiếp là an toàn.
    private static void write(HttpServletResponse response, ErrorCode code, String message) throws IOException {
        response.setStatus(code.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"success\":false,\"error\":{\"code\":\"" + code.name() + "\",\"message\":\"" + message + "\"}}");
    }
}
