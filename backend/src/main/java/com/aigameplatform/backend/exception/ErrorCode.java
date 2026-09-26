package com.aigameplatform.backend.exception;

import org.springframework.http.HttpStatus;

/** Bảng mã lỗi dùng chung theo REST API Contract v1.0.0. */
public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    NOT_FOUND(HttpStatus.NOT_FOUND),
    FILE_TOO_LARGE_OR_INVALID_FORMAT(HttpStatus.UNPROCESSABLE_ENTITY),
    UNSAFE_CONTENT(HttpStatus.UNPROCESSABLE_ENTITY),
    AI_GENERATION_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
