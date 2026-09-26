package com.aigameplatform.backend.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class RegisterRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeFactory() {
        factory.close();
    }

    private static Set<String> invalidFields(RegisterRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    void acceptsValidRequest() {
        assertThat(invalidFields(new RegisterRequest("Nguyễn Văn A", "a@school.edu.vn", "Abcdef1!"))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Ab1!",          // quá ngắn
            "abcdef1!",      // thiếu chữ hoa
            "ABCDEF1!",      // thiếu chữ thường
            "Abcdefg!",      // thiếu số
            "Abcdefg1",      // thiếu ký tự đặc biệt
            "Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!x" // 73 ký tự
    })
    void rejectsWeakPasswords(String password) {
        assertThat(invalidFields(new RegisterRequest("A", "a@school.edu.vn", password))).containsExactly("password");
    }

    @Test
    void acceptsPasswordOfExactly72Characters() {
        String password = "Abcdef1!" + "x".repeat(64);

        assertThat(password).hasSize(72);
        assertThat(invalidFields(new RegisterRequest("A", "a@school.edu.vn", password))).isEmpty();
    }

    @Test
    void rejectsBlankNameAndInvalidEmail() {
        assertThat(invalidFields(new RegisterRequest(" ", "not-an-email", "Abcdef1!")))
                .containsExactlyInAnyOrder("fullName", "email");
    }
}
