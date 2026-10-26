package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import com.aigameplatform.backend.exception.GenerationScopeUnsupportedException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.curriculum.CurriculumContextProvider;
import com.aigameplatform.backend.service.curriculum.CurriculumEvidenceReview;
import tools.jackson.databind.node.ObjectNode;
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
    private final ObjectProvider<CurriculumContextProvider> curriculumProvider;
    private final ObjectProvider<CurriculumEvidenceReviewer> curriculumReviewerProvider;
    private final boolean curriculumRagEnabled;
    private final int maxRetries;

    // ObjectProvider để ứng dụng vẫn khởi động khi chưa có bản cài đặt cổng AI; thiếu thì báo lúc gọi.
    public GameGenerationService(
            ObjectProvider<GameContentGenerator> generatorProvider,
            GameContentStrategyRegistry strategies,
            AiOutputValidator aiOutputValidator,
            GameDslFactoryRegistry factories,
            GameValidationService validationService,
            JsonMapper jsonMapper,
            ObjectProvider<CurriculumContextProvider> curriculumProvider,
            ObjectProvider<CurriculumEvidenceReviewer> curriculumReviewerProvider,
            @Value("${app.curriculum-rag.enabled:false}") boolean curriculumRagEnabled,
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
        this.curriculumProvider = curriculumProvider;
        this.curriculumReviewerProvider = curriculumReviewerProvider;
        this.curriculumRagEnabled = curriculumRagEnabled;
        this.maxRetries = maxRetries;
    }

    /**
     * @return game DSL hoàn chỉnh đã qua cả 3 lớp kiểm duyệt
     * @throws UnsafeContentException nếu nội dung không an toàn với trẻ em
     * @throws AiGenerationTimeoutException nếu AI hoặc kiểm duyệt không dùng được, hoặc hết số lần thử
     */
    public GameDsl generate(GameType type, GameDslRequest request) {
        String curriculumContext = curriculumRagEnabled ? retrieveCurriculumContext(type, request) : null;
        GameContentGenerator generator = generatorProvider.getIfAvailable();
        if (generator == null) {
            throw new AiGenerationTimeoutException("Chưa cấu hình dịch vụ AI để sinh game");
        }
        String schema = strategies.get(type).getStructuredSchema();

        String previousOutput = null;
        List<ValidationError> previousErrors = List.of();
        for (int attemptNumber = 1; attemptNumber <= maxRetries + 1; attemptNumber++) {
            String raw = callAi(generator, new GenerationAttempt(type, request.topic(), request.subject(),
                    request.gradeLevel(), schema, curriculumContext, attemptNumber, previousOutput, previousErrors));

            AiOutputReport aiReport = aiOutputValidator.validate(type, raw);
            List<ValidationError> errors;
            if (aiReport.valid()) {
                ValidationReport report = validate(type, aiReport.output(), request);
                if (report.valid()) {
                    GameDsl game = report.game();
                    return curriculumRagEnabled && curriculumContext != null
                            ? addCurriculumReview(game, curriculumContext) : game;
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

    private GameDsl addCurriculumReview(GameDsl game, String context) {
        CurriculumEvidenceReview review;
        try {
            CurriculumEvidenceReviewer reviewer = curriculumReviewerProvider.getIfAvailable();
            if (reviewer == null) throw new IllegalStateException("Curriculum reviewer is unavailable");
            review = reviewer.review(game, context);
            if (review == null) throw new IllegalStateException("Curriculum reviewer returned no result");
        } catch (RuntimeException exception) {
            log.warn("Curriculum evidence review unavailable; returning game with an advisory warning: {}",
                    exception.getMessage());
            var chunkIds = curriculumChunkIds(context);
            if (chunkIds.isEmpty()) {
                log.warn("Curriculum review warning has no source chunk citations; omitting optional review metadata");
                return game;
            }
            review = CurriculumEvidenceReview.unavailable(
                    "Chưa kiểm tra được nội dung đối chiếu với chương trình.", chunkIds);
        }
        if (review.status() == CurriculumEvidenceReview.Status.REVIEWED && review.warnings().isEmpty()) {
            log.info("Curriculum evidence review found no unsupported claims (advisory only)");
        } else {
            log.warn("Curriculum evidence review requires teacher attention: status={}, warnings={}",
                    review.status(), review.warnings().size());
        }
        try {
            ObjectNode gameNode = (ObjectNode) jsonMapper.valueToTree(game);
            ObjectNode metadata = (ObjectNode) gameNode.get("metadata");
            metadata.set("curriculumReview", jsonMapper.valueToTree(review));
            return jsonMapper.treeToValue(gameNode, GameDsl.class);
        } catch (RuntimeException exception) {
            log.warn("Could not attach curriculum advisory to generated game: {}", exception.getMessage());
            return game;
        }
    }

    private static List<String> curriculumChunkIds(String context) {
        var matcher = java.util.regex.Pattern.compile("\\[([A-Za-z0-9._:-]+)]").matcher(context);
        var chunkIds = new java.util.LinkedHashSet<String>();
        while (matcher.find()) chunkIds.add(matcher.group(1));
        return List.copyOf(chunkIds);
    }

    private String retrieveCurriculumContext(GameType type, GameDslRequest request) {
        CurriculumContextProvider provider = curriculumProvider.getIfAvailable();
        if (provider == null) {
            throw new CurriculumServiceUnavailableException("Curriculum retrieval is enabled but not configured", null);
        }
        try {
            CurriculumContextProvider.Evidence evidence = provider.retrieve(
                    request.topic(), request.subject(), request.gradeLevel());
            if (evidence != null && evidence.status() == CurriculumContextProvider.Evidence.Status.UNSUPPORTED_SCOPE) {
                throw new GenerationScopeUnsupportedException(
                        "Requested curriculum scope is not supported by a reviewed dataset");
            }
            if (evidence == null || !evidence.sufficient()) {
                throw new CurriculumEvidenceNotFoundException(
                        "Không tìm thấy yêu cầu cần đạt đủ liên quan trong chương trình cho chủ đề này");
            }
            return evidence.context();
        } catch (CurriculumEvidenceNotFoundException exception) {
            throw exception;
        } catch (GenerationScopeUnsupportedException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.error("Curriculum retrieval failed: {}", exception.getMessage());
            throw new CurriculumServiceUnavailableException(
                    "Không truy xuất được căn cứ chương trình; vui lòng thử lại sau", exception);
        }
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
