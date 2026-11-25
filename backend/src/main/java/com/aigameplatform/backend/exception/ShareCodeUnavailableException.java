package com.aigameplatform.backend.exception;

public class ShareCodeUnavailableException extends ApiException {
    public ShareCodeUnavailableException(String message) {
        super(ErrorCode.SHARE_CODE_UNAVAILABLE, message);
    }
}
