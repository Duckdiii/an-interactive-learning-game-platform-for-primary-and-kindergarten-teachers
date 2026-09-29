package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.dto.request.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        // @Pattern giới hạn 72 theo số ký tự; BCryptPasswordEncoder lại từ chối theo số byte UTF-8, nên một mật
        // khẩu có dấu hoặc emoji vẫn có thể qua @Pattern nhưng vượt 72 byte. @MaxUtf8Bytes chặn đúng giới hạn đó.
        @NotBlank(message = "Mật khẩu không được để trống")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,72}$",
                message = "Mật khẩu phải có từ 8 đến 72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt")
        @MaxUtf8Bytes(value = 72, message = "Mật khẩu tối đa 72 byte khi mã hóa UTF-8")
        String password) {
}
