package com.aigameplatform.backend.dto.admin;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminUpdateTeacherRequest(
        @Size(max = 255)
        @Pattern(regexp = "(?sU).*\\S.*", message = "Họ tên không được để trống")
        String fullName,

        @Size(max = 255)
        String school
) {}
