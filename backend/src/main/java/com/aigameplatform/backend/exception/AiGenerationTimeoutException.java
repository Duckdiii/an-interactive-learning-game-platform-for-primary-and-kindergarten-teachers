package com.aigameplatform.backend.exception;

/** AI không sinh được game hợp lệ: dịch vụ AI hoặc kiểm duyệt không dùng được, hoặc hết số lần thử lại. */
public class AiGenerationTimeoutException extends ApiException {

    public AiGenerationTimeoutException(String message) {
        super(ErrorCode.AI_GENERATION_TIMEOUT, message);
    }

    public AiGenerationTimeoutException(String message, Throwable cause) {
        super(ErrorCode.AI_GENERATION_TIMEOUT, message, cause);
    }
}
