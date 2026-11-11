package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.exception.GeneratedContentUnverifiedException;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.curriculum.CurriculumContextProvider;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.CurriculumMetrics;
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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final ObjectProvider<PilotQuizContentVerifier> contentVerifierProvider;
    private final GameContentStrategyRegistry strategies;
    private final AiOutputValidator aiOutputValidator;
    private final GameDslFactoryRegistry factories;
    private final GameValidationService validationService;
    private final JsonMapper jsonMapper;
    private final ObjectProvider<CurriculumContextProvider> curriculumProvider;
    private final ObjectProvider<CurriculumCatalog> curriculumCatalog;
    private final ObjectProvider<CurriculumMetrics> metricsProvider;
    private final boolean curriculumRagEnabled;
    private final int maxRetries;
    private volatile GeneratedContentReviewer generatedContentReviewer;
    // null khi chưa cấu hình AI hoặc đã tắt bằng app.generation.wording-review.enabled=false.
    private final WordingReviewer wordingReviewer;

    // ObjectProvider để ứng dụng vẫn khởi động khi chưa có bản cài đặt cổng AI; thiếu thì báo lúc gọi.
    public GameGenerationService(
            ObjectProvider<GameContentGenerator> generatorProvider,
            ObjectProvider<PilotQuizContentVerifier> contentVerifierProvider,
            GameContentStrategyRegistry strategies,
            AiOutputValidator aiOutputValidator,
            GameDslFactoryRegistry factories,
            GameValidationService validationService,
            JsonMapper jsonMapper,
            ObjectProvider<CurriculumContextProvider> curriculumProvider,
            ObjectProvider<CurriculumCatalog> curriculumCatalog,
            ObjectProvider<CurriculumMetrics> metricsProvider,
            @Value("${app.curriculum-rag.enabled:false}") boolean curriculumRagEnabled,
            @Value("${app.generation.max-retries:2}") int maxRetries,
            ObjectProvider<WordingReviewer> wordingReviewers,
            @Value("${app.generation.wording-review.enabled:false}") boolean wordingReviewEnabled) {
        if (maxRetries < 0) {
            throw new IllegalArgumentException("app.generation.max-retries không được âm");
        }
        this.generatorProvider = generatorProvider;
        this.contentVerifierProvider = contentVerifierProvider;
        this.strategies = strategies;
        this.aiOutputValidator = aiOutputValidator;
        this.factories = factories;
        this.validationService = validationService;
        this.jsonMapper = jsonMapper;
        this.curriculumProvider = curriculumProvider;
        this.curriculumCatalog = curriculumCatalog;
        this.metricsProvider = metricsProvider;
        this.curriculumRagEnabled = curriculumRagEnabled;
        this.maxRetries = maxRetries;
        this.wordingReviewer = wordingReviewEnabled ? wordingReviewers.getIfAvailable() : null;
    }

    @Autowired(required = false)
    public void setGeneratedContentReviewer(GeneratedContentReviewer reviewer) {
        this.generatedContentReviewer = reviewer;
    }

    /**
     * @return game DSL hoàn chỉnh đã qua cả 3 lớp kiểm duyệt
     * @throws UnsafeContentException nếu nội dung không an toàn với trẻ em
     * @throws AiGenerationTimeoutException nếu AI hoặc kiểm duyệt không dùng được, hoặc hết số lần thử
     */
    public GameDsl generate(GameType type, GameDslRequest request) {
        return generateResult(type, request).game();
    }

    public GenerationResult generateResult(GameType type, GameDslRequest request) {
        return metricsProvider.getIfAvailable(CurriculumMetrics::noop).measure(CurriculumMetrics.Stage.TOTAL,
                request.subject(), request.gradeLevel(), () -> generateGame(type, request), g -> CurriculumMetrics.Outcome.SUCCESS);
    }

    private GenerationResult generateGame(GameType type, GameDslRequest request) {
        var curriculum = curriculumRagEnabled ? retrieveCurriculumContext(type, request) : CurriculumContextProvider.Evidence.insufficient();
        String curriculumContext = curriculumRagEnabled
                ? withPreschoolPedagogy(curriculum.context(), request.gradeLevel()) : null;
        GameContentGenerator generator = generatorProvider.getIfAvailable();
        if (generator == null) {
            throw new AiGenerationTimeoutException("Chưa cấu hình dịch vụ AI để sinh game");
        }
        String schema = strategies.get(type).getStructuredSchema();

        String previousOutput = null;
        String lastUnverifiedReason = null;
        GenerationResult lastPassed = null;
        List<ValidationError> previousErrors = List.of();
        for (int attemptNumber = 1; attemptNumber <= maxRetries + 1; attemptNumber++) {
            String raw = callAi(generator, new GenerationAttempt(type, request.topic(), request.subject(),
                    request.gradeLevel(), schema, curriculumContext, attemptNumber, previousOutput, previousErrors));

            AiOutputReport aiReport = aiOutputValidator.validate(type, raw);
            List<ValidationError> errors;
            if (!aiReport.valid()) {
                errors = aiReport.errors();
            } else {
                ValidationReport report = validate(type, aiReport.output(), request);
                if (!report.valid()) {
                    if (report.unsafe()) {
                        log.warn("Generated content rejected by safety validation (attempt {})", attemptNumber);
                        throw new UnsafeContentException("Nội dung không phù hợp với trẻ em");
                    }
                    if (report.unavailable()) {
                        throw new AiGenerationTimeoutException("Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau");
                    }
                    errors = report.errors();
                } else if (!curriculumRagEnabled) {
                    GenerationResult passed = new GenerationResult(report.game(), curriculum.evidence(),
                            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable());
                    List<ValidationError> wording = attemptNumber > maxRetries ? List.of() : reviewWording(report.game(), request.topic());
                    if (wording.isEmpty()) return passed;
                    // Game này đã qua 3 lớp: giữ lại để trả về nếu các lần sinh lại đều hỏng (bước rà có thể báo nhầm).
                    lastPassed = passed;
                    errors = wording;
                } else {
                    if (type == GameType.QUIZ && request.subject() == Subject.MATH
                            && request.gradeLevel() == GradeLevel.GRADE_1) {
                        PilotQuizContentVerifier verifier = contentVerifierProvider.getIfAvailable();
                        if (verifier == null) throw new GeneratedContentUnverifiedException("CONTENT_VERIFIER_UNAVAILABLE");
                        PilotQuizContentVerifier.Result decision = verifier.verify(report.game(), request.topic(), curriculum.evidence());
                        if (decision.status() == PilotQuizContentVerifier.Status.UNVERIFIED) {
                            lastUnverifiedReason = decision.errors().isEmpty()
                                    ? "CONTENT_NOT_MACHINE_CHECKABLE" : decision.errors().get(0).message();
                            errors = decision.errors();
                            // Keep conclusive arithmetic failures authoritative. Only forms outside the
                            // pilot's grammar may proceed to a separately identified semantic review.
                            if (generatedContentReviewer != null && !supportsPilotArithmetic(request.topic())
                                    && java.util.Set.of("REQUEST_NOT_MACHINE_CHECKABLE", "QUESTION_NOT_MACHINE_CHECKABLE",
                                            "ANSWER_OPTIONS_NOT_MACHINE_CHECKABLE", "REQUEST_NUMBER_INTERVAL_NOT_MACHINE_CHECKABLE",
                                            "MULTIPLE_CONSTRAINTS_FOR_SAME_SKILL_NOT_SUPPORTED").contains(lastUnverifiedReason)) {
                                var semantic = reviewSemantically(report.game(), request.topic(), curriculum.evidence());
                                if (semantic != null && semantic.accepted())
                                    return new GenerationResult(report.game(), curriculum.evidence(), semantic.review());
                                if (semantic != null && !semantic.errors().isEmpty()) {
                                    errors = semantic.errors();
                                    lastUnverifiedReason = errors.getFirst().message();
                                }
                            }
                        } else if (decision.status() == PilotQuizContentVerifier.Status.INVALID) {
                            errors = decision.errors();
                        } else {
                            var claims = decision.chunkIds().stream().map(chunkId -> java.util.Map.<String, Object>of(
                                    "chunkId", chunkId,
                                    "claim", "Question arithmetic and numeric scope passed deterministic pilot checks"))
                                    .toList();
                            var review = new com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview(
                                    com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.REVIEWED,
                                    claims, List.of(), "math-g1-quiz-deterministic-v1");
                            return new GenerationResult(report.game(), curriculum.evidence(), review);
                        }
                    } else {
                        GeneratedContentReviewer reviewer = generatedContentReviewer;
                        if (reviewer == null)
                            throw new GeneratedContentUnverifiedException("SEMANTIC_CONTENT_REVIEWER_UNAVAILABLE");
                        GeneratedContentReviewer.Result decision;
                        decision = reviewSemantically(report.game(), request.topic(), curriculum.evidence());
                        if (decision == null || !decision.accepted()) {
                            lastUnverifiedReason = decision == null || decision.errors().isEmpty()
                                    ? "SEMANTIC_CONTENT_NOT_VERIFIED" : decision.errors().get(0).message();
                            errors = decision == null ? List.of(new ValidationError("$", lastUnverifiedReason)) : decision.errors();
                        } else {
                            return new GenerationResult(report.game(), curriculum.evidence(), decision.review());
                        }
                    }
                }
            }

            log.info("Lần thử {} cho {} chưa hợp lệ: {} lỗi", attemptNumber, type, errors.size());
            previousOutput = raw;
            previousErrors = errors.stream().limit(MAX_FEEDBACK_ERRORS).toList();
        }
        if (lastPassed != null) {
            log.info("Các lần sinh lại sau bước rà chính tả đều chưa hợp lệ, trả game đã qua 3 lớp trước đó");
            return lastPassed;
        }
        if (lastUnverifiedReason != null) throw new GeneratedContentUnverifiedException(lastUnverifiedReason);
        throw new AiGenerationTimeoutException("AI chưa sinh được game hợp lệ sau " + (maxRetries + 1) + " lần thử");
    }

    /**
     * Rà từ không có thật / sai chính tả. Lần thử cuối không rà (trả game đã qua 3 lớp thay vì báo lỗi), và bước rà lỗi thì bỏ qua: đây là
     * kiểm tra phụ, không được làm hỏng việc tạo game. Nhánh RAG (thí điểm có kiểm chứng chương trình học) cố ý không rà: đã có bộ kiểm
     * riêng và giữ đúng hành vi đã được duyệt của nhánh đó.
     */
    private List<ValidationError> reviewWording(GameDsl game, String topic) {
        WordingReviewer reviewer = wordingReviewer;
        if (reviewer == null) return List.of();
        try {
            return reviewer.review(game, topic);
        } catch (AiServiceUnavailableException e) {
            log.warn("Bỏ qua bước rà chính tả ({})", e.getCause() == null ? e.getClass().getSimpleName() : e.getCause().getClass().getSimpleName());
            return List.of();
        }
    }

    private GeneratedContentReviewer.Result reviewSemantically(GameDsl game, String topic,
            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence evidence) {
        try { return generatedContentReviewer.review(game, topic, evidence); }
        catch (RuntimeException unavailable) {
            throw new AiGenerationTimeoutException("Không kiểm tra được mức bám YCCĐ của nội dung game.", unavailable);
        }
    }

    private static boolean supportsPilotArithmetic(String topic) {
        return new com.aigameplatform.backend.service.curriculum.CurriculumTopicParser().parse(topic)
                .supportsPilotArithmetic();
    }

    private CurriculumContextProvider.Evidence retrieveCurriculumContext(GameType type, GameDslRequest request) {
        var catalog = curriculumCatalog.getIfAvailable();
        if (catalog == null) throw new CurriculumServiceUnavailableException("Curriculum catalog not configured", null);
        catalog.requireSupported(type, request.subject(), request.gradeLevel());
        CurriculumContextProvider provider = curriculumProvider.getIfAvailable();
        if (provider == null) {
            throw new CurriculumServiceUnavailableException("Curriculum retrieval is enabled but not configured", null);
        }
        try {
            CurriculumContextProvider.Evidence evidence = provider.retrieve(
                    request.topic(), request.subject(), request.gradeLevel(), request.kindergartenAgeBand(),
                    request.curriculumDomain());
            if (evidence == null || !evidence.sufficient()) {
                throw new CurriculumEvidenceNotFoundException(
                        "Không tìm thấy yêu cầu cần đạt đủ liên quan trong chương trình đã chọn cho chủ đề này");
            }
            return evidence;
        } catch (CurriculumEvidenceNotFoundException exception) {
            throw exception;
        } catch (com.aigameplatform.backend.exception.CurriculumClarificationRequiredException exception) {
            throw exception;
        } catch (com.aigameplatform.backend.exception.KindergartenAgeBandRequiredException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.error("Curriculum retrieval failed ({})", exception.getClass().getSimpleName());
            throw new CurriculumServiceUnavailableException(
                    "Không truy xuất được căn cứ chương trình; vui lòng thử lại sau", exception);
        }
    }

    private static String withPreschoolPedagogy(String context, GradeLevel grade) {
        if (grade != GradeLevel.KINDERGARTEN || context == null || context.isBlank()) return context;
        return "RÀNG BUỘC SƯ PHẠM MẦM NON: Dùng câu ngắn, ít chữ; ưu tiên hình ảnh và hướng dẫn bằng âm thanh khi kiểu game hỗ trợ. "
                + "Không yêu cầu trẻ đọc nhiều. Điều chỉnh độ khó theo độ tuổi ghi trong từng kết quả mong đợi; không suy rộng sang độ tuổi khác.\n\n"
                + "CĂN CỨ CHƯƠNG TRÌNH:\n" + context;
    }

    private String callAi(GameContentGenerator generator, GenerationAttempt attempt) {
        try {
            return metricsProvider.getIfAvailable(CurriculumMetrics::noop).measure(CurriculumMetrics.Stage.GENERATION,
                    attempt.subject(), attempt.gradeLevel(), () -> generator.generate(attempt), g -> CurriculumMetrics.Outcome.SUCCESS);
        } catch (AiServiceUnavailableException e) {
            log.error("Không gọi được dịch vụ AI ({})", e.getClass().getSimpleName());
            throw new AiGenerationTimeoutException("Dịch vụ AI không phản hồi, vui lòng thử lại sau", e);
        }
    }

    private ValidationReport validate(GameType type, AiGameOutput output, GameDslRequest request) {
        GameDsl game = factories.create(type, output, request);
        return validationService.validate(jsonMapper.valueToTree(game));
    }
}
