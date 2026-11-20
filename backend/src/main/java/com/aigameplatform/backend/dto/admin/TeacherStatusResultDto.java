package com.aigameplatform.backend.dto.admin;

import com.aigameplatform.backend.entity.enums.TeacherAccountStatus;

public record TeacherStatusResultDto(
        String teacherId,
        TeacherAccountStatus status
) {}
