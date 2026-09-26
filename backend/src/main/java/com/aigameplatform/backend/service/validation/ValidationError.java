package com.aigameplatform.backend.service.validation;

/** Một lỗi kiểm duyệt: vị trí trong JSON (ví dụ {@code $.questions[0].options}) và mô tả lỗi. */
public record ValidationError(String path, String message) {

    @Override
    public String toString() {
        return path + ": " + message;
    }
}
