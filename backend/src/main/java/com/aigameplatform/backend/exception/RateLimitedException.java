package com.aigameplatform.backend.exception;

/** 429 {@code RATE_LIMITED}; {@code retryAfterSeconds} đi vào header {@code Retry-After}. */
public class RateLimitedException extends ApiException {

    private final long retryAfterSeconds;

    public RateLimitedException(String message, long retryAfterSeconds) {
        this(ErrorCode.RATE_LIMITED, message, retryAfterSeconds);
    }

    // Cho các mã 429 khác (ví dụ LOGIN_TEMPORARILY_LOCKED) dùng chung cách trả header Retry-After.
    protected RateLimitedException(ErrorCode errorCode, String message, long retryAfterSeconds) {
        super(errorCode, message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
