package com.aigameplatform.backend.exception;

/**
 * Nội dung AI sinh ra không phù hợp với trẻ em. Khi gộp nhánh JWT, lớp này đổi sang extends ApiException với
 * ErrorCode.UNSAFE_CONTENT (422).
 */
public class UnsafeContentException extends RuntimeException {

    public UnsafeContentException(String message) {
        super(message);
    }
}
