package com.aigameplatform.backend.exception;

/** 429 {@code LOGIN_TEMPORARILY_LOCKED}: đăng nhập sai quá nhiều lần liên tiếp; kèm {@code Retry-After}. */
public class LoginTemporarilyLockedException extends RateLimitedException {

    public LoginTemporarilyLockedException(String message, long retryAfterSeconds) {
        super(ErrorCode.LOGIN_TEMPORARILY_LOCKED, message, retryAfterSeconds);
    }
}
