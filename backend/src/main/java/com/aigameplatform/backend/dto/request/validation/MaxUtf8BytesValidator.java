package com.aigameplatform.backend.dto.request.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

public class MaxUtf8BytesValidator implements ConstraintValidator<MaxUtf8Bytes, String> {

    private int max;

    @Override
    public void initialize(MaxUtf8Bytes constraintAnnotation) {
        this.max = constraintAnnotation.value();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null/blank đã có @NotBlank lo; ở đây chỉ xét giới hạn trên.
        return value == null || value.getBytes(StandardCharsets.UTF_8).length <= max;
    }
}
