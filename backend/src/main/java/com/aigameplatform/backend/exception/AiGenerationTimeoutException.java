package com.aigameplatform.backend.exception;

/**
 * AI không sinh được game hợp lệ: dịch vụ AI hoặc kiểm duyệt không dùng được, hoặc hết số lần thử lại. Khi gộp
 * nhánh JWT, lớp này đổi sang extends ApiException với ErrorCode.AI_GENERATION_TIMEOUT (504).
 */
public class AiGenerationTimeoutException extends RuntimeException {

    public AiGenerationTimeoutException(String message) {
        super(message);
    }

    public AiGenerationTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
