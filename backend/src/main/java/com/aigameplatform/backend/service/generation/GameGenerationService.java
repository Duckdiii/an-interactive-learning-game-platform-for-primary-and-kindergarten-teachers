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
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.service.media.SceneImageLoader;
import com.aigameplatform.backend.service.media.SceneImageUnavailableException;
import com.aigameplatform.backend.service.media.InvalidSceneImageException;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.validation.ai.AiOutputSchemas;
import com.aigameplatform.backend.service.validation.ai.AiOutputReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.util.List;
import java.net.URI;
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
    private static final int MAX_OPTION_IMAGES_FOR_REVIEW = 32;
    private static final long MAX_OPTION_IMAGE_REVIEW_BYTES = 32L * 1024 * 1024;

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
    @Autowired(required = false)
    private SceneImageLoader sceneImageLoader;

    public void setSceneImageLoader(SceneImageLoader loader) {
        this.sceneImageLoader = loader;
    }

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
            @Value("${app.generation.max-retries:2}") int maxRetries) {
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
        VisualClozeImageGenerationInput imageInput = loadImageInput(type, request);
        boolean oddImageMode = type == GameType.ODD_ONE_OUT && request.effectiveVisualClozeMode() == VisualClozeMode.IMAGE;
        boolean avmCatalogMode = type == GameType.AUDIO_VISUAL_MATCH && request.effectiveVisualClozeMode() == VisualClozeMode.IMAGE;
        String schema = oddImageMode ? AiOutputSchemas.oddImageForLlm() : imageInput == null
                ? strategies.get(type).getStructuredSchema() : AiOutputSchemas.visualClozeImageForLlm();

        String previousOutput = null;
        String lastUnverifiedReason = null;
        List<ValidationError> previousErrors = List.of();
        for (int attemptNumber = 1; attemptNumber <= maxRetries + 1; attemptNumber++) {
            String raw = callAi(generator, new GenerationAttempt(type, request.topic(), request.subject(),
                    request.gradeLevel(), schema, curriculumContext, attemptNumber, previousOutput, previousErrors,
                    imageInput, oddImageMode, avmCatalogMode));

            AiOutputReport aiReport = aiOutputValidator.validate(type, raw, imageInput != null || oddImageMode);
            List<ValidationError> errors;
            if (!aiReport.valid()) {
                errors = aiReport.errors();
            } else {
                ValidationReport report = validate(type, aiReport.output(), request, imageInput);
                if (!report.valid()) {
                    if (report.unsafe()) {
                        log.warn("Generated content rejected by safety validation (attempt {})", attemptNumber);
                        throw new UnsafeContentException("Nội dung không phù hợp với trẻ em");
                    }
                    if (report.unavailable()) {
                        throw new AiGenerationTimeoutException("Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau");
                    }
                    errors = report.errors();
                } else if (!curriculumRagEnabled && imageInput == null && !oddImageMode && !avmCatalogMode) {
                    return new GenerationResult(report.game(), curriculum.evidence(),
                            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable());
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
                        if (imageInput == null) {
                            decision = reviewSemantically(report.game(), request.topic(), curriculum.evidence());
                        } else {
                            var optionImages = loadOptionImages(report.game(), imageInput);
                            decision = reviewSemantically(report.game(), request.topic(), curriculum.evidence(), imageInput,
                                    optionImages);
                        }
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
        if (lastUnverifiedReason != null) throw new GeneratedContentUnverifiedException(lastUnverifiedReason);
        if (oddImageMode || avmCatalogMode)
            throw new ApiException(ErrorCode.VALIDATION_ERROR,
                    "AI chưa sinh được câu hỏi hợp lệ từ thư viện Noto; vui lòng thử lại hoặc chọn chủ đề khác");
        throw new AiGenerationTimeoutException("AI chưa sinh được game hợp lệ sau " + (maxRetries + 1) + " lần thử");
    }

    private GeneratedContentReviewer.Result reviewSemantically(GameDsl game, String topic,
            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence evidence) {
        try { return generatedContentReviewer.review(game, topic, evidence); }
        catch (RuntimeException unavailable) {
            throw new AiGenerationTimeoutException("Không kiểm tra được mức bám YCCĐ của nội dung game.", unavailable);
        }
    }

    private GeneratedContentReviewer.Result reviewSemantically(GameDsl game, String topic,
            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence evidence,
            VisualClozeImageGenerationInput imageInput,
            java.util.Map<String, com.aigameplatform.backend.service.media.LoadedSceneImage> optionImages) {
        try { return generatedContentReviewer.review(game, topic, evidence, imageInput.sceneImage(), optionImages); }
        catch (RuntimeException unavailable) {
            throw new AiGenerationTimeoutException("Could not verify image-based game against scene and curriculum", unavailable);
        }
    }

    private java.util.Map<String, com.aigameplatform.backend.service.media.LoadedSceneImage> loadOptionImages(
            GameDsl game, VisualClozeImageGenerationInput imageInput) {
        if (!(game instanceof com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl visual)
                || visual.effectiveMode() != VisualClozeMode.IMAGE) return java.util.Map.of();
        var references = visual.questions().stream().flatMap(question -> question.options().stream()
                .map(option -> new java.util.AbstractMap.SimpleImmutableEntry<>(question.id() + "/" + option.id(), option)))
                .toList();
        if (references.size() > MAX_OPTION_IMAGES_FOR_REVIEW)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "IMAGE games may contain at most 32 option images for review");
        var result = new java.util.LinkedHashMap<String, com.aigameplatform.backend.service.media.LoadedSceneImage>();
        var supplied = imageInput.optionImages().stream().collect(java.util.stream.Collectors.toMap(
                VisualClozeOptionImageInput::imageUrl, VisualClozeOptionImageInput::image));
        for (var reference : references) {
            String url = reference.getValue().imageUrl();
            var image = supplied.get(url);
            if (image == null) throw new ApiException(ErrorCode.VALIDATION_ERROR,
                    "Generated IMAGE options must use teacher-provided optionImages");
            result.put(reference.getKey(), image);
        }
        return java.util.Collections.unmodifiableMap(result);
    }

    private VisualClozeImageGenerationInput loadImageInput(GameType type, GameDslRequest request) {
        if (request.effectiveVisualClozeMode() != VisualClozeMode.IMAGE) return null;
        if (type == GameType.ODD_ONE_OUT || type == GameType.AUDIO_VISUAL_MATCH) return null;
        if (type != GameType.VISUAL_CLOZE) {
            throw new IllegalArgumentException("IMAGE mode is only supported for VISUAL_CLOZE");
        }
        if (request.sceneImageUrl() == null || request.sceneImageUrl().isBlank()) {
            throw new IllegalArgumentException("sceneImageUrl is required for IMAGE mode");
        }
        if (request.optionImages() == null || request.optionImages().size() < 2 || request.optionImages().size() > 8) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "IMAGE mode requires 2 to 8 teacher-provided optionImages");
        }
        if (request.optionImages().stream().map(com.aigameplatform.backend.dto.request.GenerateGameRequest.OptionImage::imageUrl)
                .distinct().count() != request.optionImages().size())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "optionImages must use distinct imageUrl values");
        if (sceneImageLoader == null) {
            throw new AiGenerationTimeoutException("Scene image service is not configured");
        }
        try {
            var image = sceneImageLoader.load(URI.create(request.sceneImageUrl()));
            long optionBytes = 0;
            var options = new java.util.ArrayList<VisualClozeOptionImageInput>();
            for (var option : request.optionImages()) {
                var optionImage = sceneImageLoader.load(URI.create(option.imageUrl()));
                optionBytes += optionImage.bytes().length;
                if (optionBytes > MAX_OPTION_IMAGE_REVIEW_BYTES)
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "Option images exceed the total review size limit");
                options.add(new VisualClozeOptionImageInput(option.imageUrl(), option.visualPrompt(), optionImage));
            }
            return new VisualClozeImageGenerationInput(request.sceneImageUrl(), image, options);
        } catch (SceneImageUnavailableException unavailable) {
            throw new ApiException(ErrorCode.SCENE_IMAGE_UNAVAILABLE, "Scene image service is unavailable", unavailable);
        } catch (InvalidSceneImageException | IllegalArgumentException invalidImage) {
            throw new ApiException(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT,
                    "sceneImageUrl is invalid or the image cannot be used", invalidImage);
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

    private ValidationReport validate(GameType type, AiGameOutput output, GameDslRequest request,
            VisualClozeImageGenerationInput imageInput) {
        if (type == GameType.AUDIO_VISUAL_MATCH && request.effectiveVisualClozeMode() == VisualClozeMode.IMAGE) {
            var avm = (com.aigameplatform.backend.dto.dsl.ai.AudioVisualMatchAiOutput) output;
            var catalog = new com.aigameplatform.backend.service.media.NotoEmojiCatalog();
            var problems = new java.util.ArrayList<ValidationError>();
            for (int i = 0; i < avm.questions().size(); i++) {
                var question = avm.questions().get(i);
                var ids = new java.util.ArrayList<String>();
                ids.add(question.correct().visualPrompt());
                question.distractors().forEach(choice -> ids.add(choice.visualPrompt()));
                var concepts = ids.stream().map(id -> catalog.find(id).map(asset -> asset.conceptId()).orElse(""))
                        .toList();
                if (ids.stream().anyMatch(id -> catalog.find(id).isEmpty())
                        || new java.util.HashSet<>(ids).size() != ids.size()
                        || new java.util.HashSet<>(concepts).size() != concepts.size())
                    problems.add(new ValidationError("$.questions[" + i + "]", "Dùng các mã ảnh khác nhau có trong catalog"));
            }
            if (!problems.isEmpty()) return new ValidationReport(problems, null);
        }
        if (type == GameType.ODD_ONE_OUT && request.effectiveVisualClozeMode() == VisualClozeMode.IMAGE) {
            var odd = (com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput) output;
            var catalog = new com.aigameplatform.backend.service.media.NotoEmojiCatalog();
            var problems = new java.util.ArrayList<ValidationError>();
            for (int i = 0; i < odd.questions().size(); i++) {
                var question = odd.questions().get(i);
                if (question.items().stream().anyMatch(id -> catalog.find(id).isEmpty())
                        || new java.util.HashSet<>(question.items()).size() != question.items().size())
                    problems.add(new ValidationError("$.questions[" + i + "].items", "Dùng các mã ảnh khác nhau có trong catalog"));
            }
            if (!problems.isEmpty()) return new ValidationReport(problems, null);
        }
        if (imageInput != null) {
            List<ValidationError> assetErrors = validateSuppliedOptionAssets(output, imageInput);
            if (!assetErrors.isEmpty()) return new ValidationReport(assetErrors, null);
        }
        GameDsl game = factories.create(type, output, request, imageInput);
        return validationService.validate(jsonMapper.valueToTree(game));
    }

    private List<ValidationError> validateSuppliedOptionAssets(AiGameOutput output,
            VisualClozeImageGenerationInput imageInput) {
        if (!(output instanceof com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiOutput visual)
                || visual.questions() == null)
            return List.of(new ValidationError("$.questions", "IMAGE output must contain questions"));
        var supplied = imageInput.optionImages().stream().collect(java.util.stream.Collectors.toMap(
                VisualClozeOptionImageInput::imageUrl, VisualClozeOptionImageInput::visualPrompt));
        var errors = new java.util.ArrayList<ValidationError>();
        for (int questionIndex = 0; questionIndex < visual.questions().size(); questionIndex++) {
            var options = visual.questions().get(questionIndex).options();
            String path = "$.questions[" + questionIndex + "].options";
            if (options == null || options.size() != supplied.size()) {
                errors.add(new ValidationError(path, "Use every teacher-provided option image exactly once"));
                continue;
            }
            var used = new java.util.HashSet<String>();
            for (int optionIndex = 0; optionIndex < options.size(); optionIndex++) {
                var option = options.get(optionIndex);
                String expectedPrompt = option == null ? null : supplied.get(option.imageUrl());
                if (expectedPrompt == null || !expectedPrompt.equals(option.visualPrompt()) || !used.add(option.imageUrl()))
                    errors.add(new ValidationError(path + "[" + optionIndex + "]",
                            "Copy an imageUrl and visualPrompt from the teacher-provided optionImages without reuse"));
            }
            if (used.size() != supplied.size())
                errors.add(new ValidationError(path, "Use every teacher-provided option image exactly once"));
        }
        return List.copyOf(errors);
    }
}
