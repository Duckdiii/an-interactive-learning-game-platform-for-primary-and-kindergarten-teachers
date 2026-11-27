package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.entity.enums.UserRole;

public record TeacherInfo(String teacherId, String fullName, String email, UserRole role) {

    public TeacherInfo(String teacherId, String fullName, String email) {
        this(teacherId, fullName, email, UserRole.ROLE_TEACHER);
    }
}
