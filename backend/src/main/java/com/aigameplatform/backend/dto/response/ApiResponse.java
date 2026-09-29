package com.aigameplatform.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Envelope chung: {success, data} khi thành công, {success, error} khi lỗi. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, T data, ApiError error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> fail(String code, String message) {
        return new ApiResponse<>(false, null, new ApiError(code, message));
    }
}
