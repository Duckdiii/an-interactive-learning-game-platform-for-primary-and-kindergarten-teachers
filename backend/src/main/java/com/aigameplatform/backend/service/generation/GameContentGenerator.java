package com.aigameplatform.backend.service.generation;

/**
 * Cổng tới nhà cung cấp AI (Gemini qua LangChain4j). Bộ điều phối chỉ biết cổng này nên test được bằng bản giả và
 * đổi nhà cung cấp không ảnh hưởng phần còn lại.
 */
public interface GameContentGenerator {

    /**
     * Sinh JSON theo {@link GenerationAttempt#structuredSchema()}. Từ lần thứ hai, yêu cầu mang theo kết quả trước
     * và các lỗi của nó để AI tự sửa.
     *
     * @return JSON thô do AI trả về (chưa kiểm tra)
     * @throws AiServiceUnavailableException nếu không gọi được AI (hết thời gian, hết quota, lỗi mạng...)
     */
    String generate(GenerationAttempt attempt);
}
