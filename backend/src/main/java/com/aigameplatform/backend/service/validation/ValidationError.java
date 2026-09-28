package com.aigameplatform.backend.service.validation;

/**
 * Một lỗi kiểm duyệt: vị trí trong JSON (ví dụ {@code $.questions[0].options}), mô tả lỗi và loại lỗi.
 * Loại lỗi quyết định cách xử lý: INVALID thì cho AI sinh lại, UNSAFE thì trả 422 UNSAFE_CONTENT ngay,
 * UNAVAILABLE thì báo không kiểm tra được và cho thử lại sau.
 */
public record ValidationError(String path, String message, Kind kind) {

    public enum Kind {
        INVALID, UNSAFE, UNAVAILABLE
    }

    public ValidationError(String path, String message) {
        this(path, message, Kind.INVALID);
    }

    @Override
    public String toString() {
        return path + ": " + message;
    }
}
