package com.aigameplatform.backend.exception;

/** 429 {@code RATE_LIMITED}; {@code retryAfterSeconds} đi vào header {@code Retry-After}. */
public class RateLimitedException extends ApiException {

    private final long retryAfterSeconds;

    public RateLimitedException(String message, long retryAfterSeconds) {
        super(ErrorCode.RATE_LIMITED, message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
