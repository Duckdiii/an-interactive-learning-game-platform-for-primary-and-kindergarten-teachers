package com.aigameplatform.backend.service.generation.cpf;

/**
 * Cổng tới mô hình AI sinh game CPF (docs/cpf-game-v2.0.0.md). Trả JSON thô; kiểm duyệt nằm ở
 * {@code CpfGenerationService}. Qua interface để test mock được, không gọi API thật.
 */
public interface CpfContentGenerator {

    /** @throws com.aigameplatform.backend.service.generation.AiServiceUnavailableException khi gọi AI lỗi */
    String generate(CpfGenerationAttempt attempt);
}
