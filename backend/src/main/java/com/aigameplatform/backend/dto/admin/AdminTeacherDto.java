package com.aigameplatform.backend.dto.admin;

import com.aigameplatform.backend.entity.enums.TeacherAccountStatus;
import java.time.LocalDateTime;

public record AdminTeacherDto(
        String teacherId,
        String fullName,
        String email,
        String school,
        TeacherAccountStatus status,
        LocalDateTime createdAt
) {}
