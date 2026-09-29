package com.aigameplatform.backend.service.validation.safety;

/** Dịch vụ kiểm duyệt bên ngoài không trả được kết quả hợp lệ (lỗi mạng, hết thời gian, sai key, phản hồi lạ). */
public class ModerationUnavailableException extends RuntimeException {

    public ModerationUnavailableException(String message) {
        super(message);
    }

    public ModerationUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
