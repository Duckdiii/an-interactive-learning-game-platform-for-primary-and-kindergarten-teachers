package com.aigameplatform.backend.dto.request.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Yêu cầu độ mạnh mật khẩu dùng chung cho đăng ký và đặt lại mật khẩu (schema {@code Password} trong openapi.yaml),
 * để hai nơi không lệch nhau. Mỗi ràng buộc thành phần tự báo thông điệp riêng.
 *
 * <p>{@code @Pattern} giới hạn 72 theo số ký tự; BCryptPasswordEncoder lại từ chối theo số byte UTF-8, nên một mật
 * khẩu có dấu hoặc emoji vẫn có thể qua {@code @Pattern} nhưng vượt 72 byte. {@code @MaxUtf8Bytes} chặn đúng giới
 * hạn đó.
 */
@NotBlank(message = "Mật khẩu không được để trống")
@Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,72}$",
        message = "Mật khẩu phải có từ 8 đến 72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt")
@MaxUtf8Bytes(value = 72, message = "Mật khẩu tối đa 72 byte khi mã hóa UTF-8")
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = {})
public @interface StrongPassword {

    String message() default "Mật khẩu không hợp lệ";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
