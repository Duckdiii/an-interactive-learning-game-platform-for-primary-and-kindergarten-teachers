package com.aigameplatform.backend.security;

/** Người dùng đang đăng nhập, được dựng từ claims của access token. */
public record AuthenticatedTeacher(String teacherId, String email, String sessionId) {
}
