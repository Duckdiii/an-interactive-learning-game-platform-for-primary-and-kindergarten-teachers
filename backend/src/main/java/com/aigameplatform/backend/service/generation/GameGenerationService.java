package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.factory.GameDslFactoryRegistry;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

/**
 * Điều phối việc sinh game bằng AI: gọi AI, kiểm tra đầu ra, Backend bổ sung thành DSL hoàn chỉnh rồi qua 3 lớp
 * kiểm duyệt. Nếu đầu ra sai (INVALID) thì cho AI sinh lại kèm danh sách lỗi, tối đa {@code max-retries} lần.
 * Nội dung không an toàn bị từ chối ngay, không thử lại. Dịch vụ AI hoặc kiểm duyệt không dùng được, hoặc hết số
 * lần thử, thì báo hết thời gian.
 */
@Slf4j
@Service
public class GameGenerationService {

    /** Số lỗi tối đa đưa lại cho AI, để yêu cầu sửa không quá dài. */
    private static final int MAX_FEEDBACK_ERRORS = 10;

    private final ObjectProvider<GameContentGenerator> generatorProvider;
    private final GameContentStrategyRegistry strategies;
    private final AiOutputValidator aiOutputValidator;
    private final GameDslFactoryRegistry factories;
    private final GameValidationService validationService;
    private final JsonMapper jsonMapper;
    private final int maxRetries;

    // ObjectProvider để ứng dụng vẫn khởi động khi chưa có bản cài đặt cổng AI; thiếu thì báo lúc gọi.
    public GameGenerationService(
            ObjectProvider<GameContentGenerator> generatorProvider,
            GameContentStrategyRegistry strategies,
            AiOutputValidator aiOutputValidator,
            GameDslFactoryRegistry factories,
            GameValidationService validationService,
            JsonMapper jsonMapper,
            @Value("${app.generation.max-retries:2}") int maxRetries) {
        if (maxRetries < 0) {
            throw new IllegalArgumentException("app.generation.max-retries không được âm");
        }
        this.generatorProvider = generatorProvider;
        this.strategies = strategies;
        this.aiOutputValidator = aiOutputValidator;
        this.factories = factories;
        this.validationService = validationService;
        this.jsonMapper = jsonMapper;
        this.maxRetries = maxRetries;
    }

    /**
     * @return game DSL hoàn chỉnh đã qua cả 3 lớp kiểm duyệt
     * @throws UnsafeContentException nếu nội dung không an toàn với trẻ em
     * @throws AiGenerationTimeoutException nếu AI hoặc kiểm duyệt không dùng được, hoặc hết số lần thử
     */
    public GameDsl generate(GameType type, GameDslRequest request) {
        GameContentGenerator generator = generatorProvider.getIfAvailable();
        if (generator == null) {
            throw new AiGenerationTimeoutException("Chưa cấu hình dịch vụ AI để sinh game");
        }
        String schema = strategies.get(type).getStructuredSchema();

        String previousOutput = null;
        List<ValidationError> previousErrors = List.of();
        for (int attemptNumber = 1; attemptNumber <= maxRetries + 1; attemptNumber++) {
            String raw = callAi(generator, new GenerationAttempt(type, request.topic(), request.subject(),
                    request.gradeLevel(), schema, attemptNumber, previousOutput, previousErrors));

            AiOutputReport aiReport = aiOutputValidator.validate(type, raw);
            List<ValidationError> errors;
            if (aiReport.valid()) {
                ValidationReport report = validate(type, aiReport.output(), request);
                if (report.valid()) {
                    return report.game();
                }
                if (report.unsafe()) {
                    log.warn("Nội dung AI sinh ra bị từ chối vì không an toàn (lần thử {})", attemptNumber);
                    throw new UnsafeContentException("Nội dung không phù hợp với trẻ em");
                }
                if (report.unavailable()) {
                    throw new AiGenerationTimeoutException(
                            "Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau");
                }
                errors = report.errors();
            } else {
                errors = aiReport.errors();
            }

            log.info("Lần thử {} cho {} chưa hợp lệ: {} lỗi", attemptNumber, type, errors.size());
            previousOutput = raw;
            previousErrors = errors.stream().limit(MAX_FEEDBACK_ERRORS).toList();
        }
        throw new AiGenerationTimeoutException("AI chưa sinh được game hợp lệ sau " + (maxRetries + 1) + " lần thử");
    }

    private String callAi(GameContentGenerator generator, GenerationAttempt attempt) {
        try {
            return generator.generate(attempt);
        } catch (AiServiceUnavailableException e) {
            log.error("Không gọi được dịch vụ AI: {}", e.getMessage());
            throw new AiGenerationTimeoutException("Dịch vụ AI không phản hồi, vui lòng thử lại sau", e);
        }
    }

    private ValidationReport validate(GameType type, AiGameOutput output, GameDslRequest request) {
        GameDsl game = factories.create(type, output, request);
        return validationService.validate(jsonMapper.valueToTree(game));
    }
}
