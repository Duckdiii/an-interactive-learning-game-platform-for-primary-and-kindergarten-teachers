package com.aigameplatform.backend.security;

/** Người dùng đang đăng nhập, được dựng từ claims của access token. */
public record AuthenticatedTeacher(String teacherId, String email, String sessionId, String role) {

    public AuthenticatedTeacher(String teacherId, String email, String sessionId) {
        this(teacherId, email, sessionId, "ROLE_TEACHER");
    }
}
