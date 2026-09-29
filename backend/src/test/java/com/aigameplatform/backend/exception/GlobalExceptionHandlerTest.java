package com.aigameplatform.backend.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @SuppressWarnings("unchecked")
    private ApiResponse<Object> handle(HttpStatus status) {
        ResponseEntity<Object> response = handler.handleExceptionInternal(
                new Exception("bất kỳ"), null, new HttpHeaders(), status, null);
        return (ApiResponse<Object>) response.getBody();
    }

    // 5xx không phải lỗi của client (ví dụ timeout xử lý bất đồng bộ của Spring MVC), nên không được ghi là
    // "yêu cầu không hợp lệ".
    @Test
    void aServerErrorStatusGetsAServerErrorMessage() {
        ApiResponse<Object> body = handle(HttpStatus.SERVICE_UNAVAILABLE);

        assertThat(body.error().code()).isEqualTo(ErrorCode.INTERNAL_ERROR.name());
        assertThat(body.error().message()).isEqualTo("Lỗi hệ thống, vui lòng thử lại sau");
    }

    @Test
    void notFoundKeepsItsOwnMessage() {
        ApiResponse<Object> body = handle(HttpStatus.NOT_FOUND);

        assertThat(body.error().code()).isEqualTo(ErrorCode.NOT_FOUND.name());
        assertThat(body.error().message()).isEqualTo("Không tìm thấy tài nguyên");
    }

    @Test
    void aClientErrorStatusGetsTheInvalidRequestMessage() {
        ApiResponse<Object> body = handle(HttpStatus.METHOD_NOT_ALLOWED);

        assertThat(body.error().code()).isEqualTo(ErrorCode.VALIDATION_ERROR.name());
        assertThat(body.error().message()).isEqualTo("Yêu cầu không hợp lệ");
    }
}
