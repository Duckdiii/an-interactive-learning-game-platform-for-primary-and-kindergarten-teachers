package com.aigameplatform.backend.dto.admin;

import jakarta.validation.constraints.Size;

public record AdminUpdateTeacherRequest(
        @Size(max = 255)
        String fullName,

        @Size(max = 255)
        String school
) {}
