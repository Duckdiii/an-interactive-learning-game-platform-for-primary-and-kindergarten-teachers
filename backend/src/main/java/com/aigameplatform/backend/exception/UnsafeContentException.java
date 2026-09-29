package com.aigameplatform.backend.exception;

/** Nội dung AI sinh ra không phù hợp với trẻ em. */
public class UnsafeContentException extends ApiException {

    public UnsafeContentException(String message) {
        super(ErrorCode.UNSAFE_CONTENT, message);
    }
}
