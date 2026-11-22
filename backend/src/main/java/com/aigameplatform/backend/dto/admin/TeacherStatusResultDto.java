package com.aigameplatform.backend.dto.admin;

import com.aigameplatform.backend.entity.enums.TeacherStatus;

public record TeacherStatusResultDto(
        String teacherId,
        TeacherStatus status
) {}
