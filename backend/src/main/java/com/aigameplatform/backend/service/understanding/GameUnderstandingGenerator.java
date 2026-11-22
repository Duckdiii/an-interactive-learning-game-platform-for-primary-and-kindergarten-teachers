package com.aigameplatform.backend.service.understanding;

/** Cổng tới mô hình AI phân tích yêu cầu của giáo viên. Trả JSON thô; qua interface để test mock được, không gọi API thật. */
public interface GameUnderstandingGenerator {

    /** @throws com.aigameplatform.backend.service.generation.AiServiceUnavailableException khi gọi AI lỗi */
    String generate(String systemPrompt, String userPrompt);
}
