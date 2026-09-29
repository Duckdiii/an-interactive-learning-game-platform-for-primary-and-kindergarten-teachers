package com.aigameplatform.backend.service.generation;

/** Không gọi được dịch vụ AI (hết thời gian, hết quota, sai key, lỗi mạng). Do bản cài đặt của cổng ném ra. */
public class AiServiceUnavailableException extends RuntimeException {

    public AiServiceUnavailableException(String message) {
        super(message);
    }

    public AiServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
