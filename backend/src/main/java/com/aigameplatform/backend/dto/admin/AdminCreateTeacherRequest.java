package com.aigameplatform.backend.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminCreateTeacherRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255)
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 255)
        String email,

        @Size(max = 255)
        String school,

        @NotBlank(message = "Mật khẩu khởi tạo không được để trống")
        @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6 ký tự")
        String initialPassword
) {}
