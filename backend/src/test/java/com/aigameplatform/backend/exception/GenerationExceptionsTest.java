package com.aigameplatform.backend.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Cả hai exception này phải là {@link ApiException} để {@link GlobalExceptionHandler} tự đóng gói thành envelope
 * {@code {success:false, error:{code, message}}} theo đúng mã lỗi của REST API Contract v1.0.0, thay vì rơi vào
 * nhánh {@code Exception} chung chung (trả về {@code INTERNAL_ERROR} sai với bản chất lỗi).
 */
class GenerationExceptionsTest {

    @Test
    void unsafeContentMapsTo422() {
        UnsafeContentException exception = new UnsafeContentException("Nội dung không phù hợp với trẻ em");

        assertThat(exception).isInstanceOf(ApiException.class);
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNSAFE_CONTENT);
        assertThat(exception.getErrorCode().getStatus().value()).isEqualTo(422);
        assertThat(exception.getMessage()).isEqualTo("Nội dung không phù hợp với trẻ em");
    }

    @Test
    void aiGenerationTimeoutMapsTo504() {
        AiGenerationTimeoutException exception = new AiGenerationTimeoutException("Hết thời gian chờ AI");

        assertThat(exception).isInstanceOf(ApiException.class);
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.AI_GENERATION_TIMEOUT);
        assertThat(exception.getErrorCode().getStatus().value()).isEqualTo(504);
    }

    @Test
    void aiGenerationTimeoutKeepsTheOriginalCause() {
        RuntimeException cause = new RuntimeException("lỗi gốc");

        AiGenerationTimeoutException exception = new AiGenerationTimeoutException("Hết thời gian chờ AI", cause);

        assertThat(exception.getCause()).isSameAs(cause);
    }
}
