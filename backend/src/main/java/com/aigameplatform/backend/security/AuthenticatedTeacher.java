package com.aigameplatform.backend.security;

import java.security.Principal;

/** Người dùng đang đăng nhập, được dựng từ claims của access token. */
public record AuthenticatedTeacher(String teacherId, String email, String sessionId, String role, long sessionVersion)
        implements Principal {

    public AuthenticatedTeacher(String teacherId, String email, String sessionId, String role) {
        this(teacherId, email, sessionId, role, 0);
    }

    public AuthenticatedTeacher(String teacherId, String email, String sessionId) {
        this(teacherId, email, sessionId, "ROLE_TEACHER");
    }

    @Override
    public String getName() {
        return teacherId;
    }
}
