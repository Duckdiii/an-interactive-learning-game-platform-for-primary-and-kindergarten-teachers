package com.aigameplatform.backend.dto.request.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Giới hạn độ dài chuỗi theo số byte UTF-8, khác với {@code @Size} vốn đếm theo ký tự. Dùng cho mật khẩu vì
 * {@code BCryptPasswordEncoder} từ chối chuỗi quá 72 byte UTF-8, còn một ký tự có dấu hay emoji có thể chiếm
 * nhiều hơn 1 byte.
 */
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = MaxUtf8BytesValidator.class)
public @interface MaxUtf8Bytes {

    int value();

    String message() default "Chuỗi vượt quá số byte UTF-8 cho phép";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
