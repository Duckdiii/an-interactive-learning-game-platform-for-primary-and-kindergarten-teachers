package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import com.aigameplatform.backend.service.curriculum.CurriculumContextProvider;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.factory.WordScrambleGameDslFactory;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.strategy.QuizGameStrategy;
import com.aigameplatform.backend.service.strategy.WordScrambleGameStrategy;
import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.SafetyGameValidator;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

/** Bộ điều phối sinh game với cổng AI và kiểm duyệt giả: không gọi dịch vụ ngoài, không cần DB. */
class GameGenerationServiceTest {

    @Test
    void nonPilotScopeUsesSemanticGroundingGateAndDoesNotClaimHumanReview() throws Exception {
        var dataset = com.aigameplatform.backend.service.curriculum.CurriculumDataset.loadFromResourceRoot(
                "/curriculum/spike/english-grade1/");
        var chunk = dataset.chunks().stream().filter(outcome -> !outcome.control()).findFirst().orElseThrow();
        var retrieved = new com.aigameplatform.backend.service.curriculum.CurriculumRAGService.RetrievedChunk(
                chunk.chunkId(), chunk.subject(), chunk.gradeLevel(), chunk.topic(), chunk.text(), .2,
                dataset.source().sourceDocument(), List.of(1238), List.of(7), dataset.source().curriculumVersion());
        var evidence = com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(
                dataset.source(), "fixture", List.of(retrieved));
        CurriculumContextProvider provider = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("English outcome with source; Provenance: sourceSha256=" + dataset.source().sourceSha256() + "; datasetVersion=" + dataset.source().datasetVersion() + "; embeddingModel=fixture", evidence);
        var generator = new ScriptedGenerator(validOutput(GameType.QUIZ));
        var service = service(generator, 0, moderation(false, false), provider, true, List.of(dataset));
        var review = new com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview(
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.PENDING,
                List.of(java.util.Map.of("chunkId", chunk.chunkId())), List.of("AUTOMATED_REVIEW_ONLY_HUMAN_REVIEW_PENDING"), "test-model");
        var reviewCalls = new java.util.concurrent.atomic.AtomicInteger();
        service.setGeneratedContentReviewer((game, topic, curriculumEvidence) -> {
            reviewCalls.incrementAndGet();
            assertThat(curriculumEvidence).isSameAs(evidence);
            return new GeneratedContentReviewer.Result(List.of(), review);
        });

        var result = service.generateResult(GameType.QUIZ,
                new GameDslRequest("Nối từ tiếng Anh với tranh", Subject.ENGLISH, GradeLevel.GRADE_1));

        assertThat(result.game().metadata().subject()).isEqualTo(Subject.ENGLISH);
        assertThat(result.evidence().datasetVersion()).isEqualTo(dataset.source().datasetVersion());
        assertThat(result.review().status()).isEqualTo(
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.PENDING);
        assertThat(reviewCalls).hasValue(1);
        assertThat(result.evidence().chunks()).containsExactly(retrieved);
        assertThat(generator.attempts.getFirst().subject()).isEqualTo(Subject.ENGLISH);
        assertThat(generator.attempts.getFirst().gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(generator.attempts.getFirst().curriculumContext()).contains("English outcome with source", "sourceSha256=");
    }

    @Test
    void kindergartenRequestPassesSelectedDomainToRetrieval() throws Exception {
        var selectedDomain = new java.util.concurrent.atomic.AtomicReference<String>();
        var evidence = CurriculumContextProvider.Evidence.found("Preschool outcome");
        CurriculumContextProvider provider = new CurriculumContextProvider() {
            @Override
            public Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel) {
                throw new AssertionError("Age-filtered retrieval must be used");
            }

            @Override
            public Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel,
                    com.aigameplatform.backend.entity.enums.KindergartenAgeBand ageBand) {
                throw new AssertionError("Selected domain must use the domain-aware overload");
            }

            @Override
            public Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel,
                    com.aigameplatform.backend.entity.enums.KindergartenAgeBand ageBand, String domain) {
                selectedDomain.set(domain);
                return evidence;
            }
        };
        var dataset = com.aigameplatform.backend.service.curriculum.CurriculumDataset.loadKindergarten();
        GameContentGenerator stopAfterRetrieval = attempt -> { throw new IllegalStateException("STOP_AFTER_RETRIEVAL"); };
        var service = service(stopAfterRetrieval, 0, moderation(false, false), provider, true, List.of(dataset));
        var request = new GameDslRequest("Nghe và kể chuyện", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN,
                com.aigameplatform.backend.entity.enums.KindergartenAgeBand.AGE_4_5, "LANGUAGE");

        assertThatThrownBy(() -> service.generate(GameType.QUIZ, request))
                .isInstanceOf(IllegalStateException.class).hasMessage("STOP_AFTER_RETRIEVAL");
        assertThat(selectedDomain).hasValue("LANGUAGE");
    }

    @Test
    void nullKindergartenDomainRetainsAgeFilteredProviderBehavior() throws Exception {
        var retrievedAge = new java.util.concurrent.atomic.AtomicReference<com.aigameplatform.backend.entity.enums.KindergartenAgeBand>();
        CurriculumContextProvider provider = new CurriculumContextProvider() {
            @Override
            public Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel) {
                throw new AssertionError("Age-filtered retrieval must be used");
            }

            @Override
            public Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel,
                    com.aigameplatform.backend.entity.enums.KindergartenAgeBand ageBand) {
                retrievedAge.set(ageBand);
                return Evidence.found("Preschool outcome");
            }
        };
        var dataset = com.aigameplatform.backend.service.curriculum.CurriculumDataset.loadKindergarten();
        GameContentGenerator stopAfterRetrieval = attempt -> { throw new IllegalStateException("STOP_AFTER_RETRIEVAL"); };
        var service = service(stopAfterRetrieval, 0, moderation(false, false), provider, true, List.of(dataset));
        var request = new GameDslRequest("Nghe và kể chuyện", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN,
                com.aigameplatform.backend.entity.enums.KindergartenAgeBand.AGE_4_5, null);

        assertThatThrownBy(() -> service.generate(GameType.QUIZ, request))
                .isInstanceOf(IllegalStateException.class).hasMessage("STOP_AFTER_RETRIEVAL");
        assertThat(retrievedAge).hasValue(com.aigameplatform.backend.entity.enums.KindergartenAgeBand.AGE_4_5);
    }

    @Test
    void nonArithmeticMathUsesSeparateSemanticReviewWithoutRewritingTheRequest() throws Exception {
        var generator = new ScriptedGenerator(validOutput(GameType.QUIZ));
        CurriculumContextProvider provider = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("Counting outcome", math1Evidence("math-g1-001"));
        var service = service(generator, 0, moderation(false, false), provider, true);
        service.setGeneratedContentReviewer((game, topic, evidence) -> new GeneratedContentReviewer.Result(List.of(),
                new com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview(
                        com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.PENDING,
                        List.of(java.util.Map.of("chunkId", "math-g1-001")), List.of("AUTOMATED_ONLY"), "fixture-semantic")));
        var result = service.generateResult(GameType.QUIZ, REQUEST);
        assertThat(result.review().reviewerModel()).isEqualTo("fixture-semantic");
        assertThat(generator.attempts.getFirst().topic()).isEqualTo(REQUEST.topic());
    }

    @Test
    void semanticReviewCannotOverrideAConclusiveWrongArithmeticAnswer() throws Exception {
        var tree = (tools.jackson.databind.node.ObjectNode) MAPPER.readTree(validArithmeticOutput());
        ((tools.jackson.databind.node.ObjectNode) tree.path("questions").get(0)).put("correctIndex", 1);
        CurriculumContextProvider provider = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("Addition outcome", math1Evidence("math-g1-007"));
        var service = service(new ScriptedGenerator(MAPPER.writeValueAsString(tree)), 0,
                moderation(false, false), provider, true);
        service.setGeneratedContentReviewer((game, topic, evidence) -> {
            throw new AssertionError("A model must never override conclusive arithmetic failure");
        });
        assertThatThrownBy(() -> service.generateResult(GameType.QUIZ, ARITHMETIC_REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class);
    }

    @Test
    void generationResultKeepsEvidenceOutsideFrozenDslWithoutRetrievingTwice() throws Exception {
        var generator = new ScriptedGenerator(validArithmeticOutput());
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        var source = new com.aigameplatform.backend.service.curriculum.CurriculumSource(
                "source.pdf", "a".repeat(64), "32/2018/TT-BGDDT", "test-v1", 2);
        var chunk = new com.aigameplatform.backend.service.curriculum.CurriculumRAGService.RetrievedChunk(
                "math-g1-007", Subject.MATH, GradeLevel.GRADE_1, "Addition", "Mental addition within 10", 0.9,
                "source.pdf", List.of(1), List.of(1), "32/2018/TT-BGDDT");
        var evidence = com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(source, "fixture", List.of(chunk));
        CurriculumContextProvider provider = (topic, subject, grade) -> {
            calls.incrementAndGet();
            return CurriculumContextProvider.Evidence.found("[math-g1-001] Count to10; source.pdf", evidence);
        };
        var result = service(generator, 2, moderation(false, false), provider, true).generateResult(GameType.QUIZ, ARITHMETIC_REQUEST);
        assertThat(calls).hasValue(1);
        assertThat(result.evidence().chunks()).containsExactly(chunk);
        assertThat(result.review().status().name()).isEqualTo("REVIEWED");
        assertThat(MAPPER.valueToTree(result.game()).path("metadata").has("curriculumReview")).isFalse();
        assertThat(MAPPER.valueToTree(result).has("review")).isTrue();
    }

    @Test
    @org.junit.jupiter.api.extension.ExtendWith(org.springframework.boot.test.system.OutputCaptureExtension.class)
    void providerErrorLogsMustNotContainTeacherOrProviderPayload(org.springframework.boot.test.system.CapturedOutput output) {
        var generator = new ScriptedGenerator(new AiServiceUnavailableException("CANARY_TEACHER_SECRET"));
        assertThatThrownBy(() -> service(generator, 0).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(output.getAll()).doesNotContain("CANARY_TEACHER_SECRET");
    }

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslRequest REQUEST = new GameDslRequest("Đếm con vật", Subject.MATH, GradeLevel.GRADE_1);
    private static final GameDslRequest ARITHMETIC_REQUEST = new GameDslRequest("Cộng nhẩm trong phạm vi 10", Subject.MATH, GradeLevel.GRADE_1);

    /** Trả lần lượt các kết quả đã định sẵn (chuỗi JSON hoặc lỗi) và ghi lại các yêu cầu nhận được. */
    private static final class ScriptedGenerator implements GameContentGenerator {

        private final Queue<Object> script = new LinkedList<>();
        final List<GenerationAttempt> attempts = new ArrayList<>();

        ScriptedGenerator(Object... results) {
            Collections.addAll(script, results);
        }

        @Override
        public String generate(GenerationAttempt attempt) {
            attempts.add(attempt);
            Object next = script.remove();
            if (next instanceof RuntimeException e) {
                throw e;
            }
            return (String) next;
        }
    }

    /** Kiểm duyệt giả: chưa cấu hình, hoặc ném lỗi không dùng được, hoặc không gắn cờ gì. */
    private static ContentModerationClient moderation(boolean configured, boolean unavailable) {
        return new ContentModerationClient() {
            @Override
            public boolean isConfigured() {
                return configured;
            }

            @Override
            public List<ModerationResult> moderate(List<String> texts) {
                if (unavailable) {
                    throw new ModerationUnavailableException("giả lập lỗi");
                }
                return texts.stream().map(t -> new ModerationResult(false, List.of())).toList();
            }
        };
    }

    private static GameGenerationService service(GameContentGenerator generator, int maxRetries,
            ContentModerationClient moderation) {
        return service(generator, maxRetries, moderation, null, false);
    }

    private static GameGenerationService service(GameContentGenerator generator, int maxRetries,
            ContentModerationClient moderation, CurriculumContextProvider curriculum, boolean ragEnabled) {
        try {
            return service(generator, maxRetries, moderation, curriculum, ragEnabled,
                    List.of(com.aigameplatform.backend.service.curriculum.CurriculumDataset.loadDefault()));
        } catch (IOException e) { throw new java.io.UncheckedIOException(e); }
    }

    private static GameGenerationService service(GameContentGenerator generator, int maxRetries,
            ContentModerationClient moderation, CurriculumContextProvider curriculum, boolean ragEnabled,
            List<com.aigameplatform.backend.service.curriculum.CurriculumDataset> catalogDatasets) {
        DefaultListableBeanFactory beans = new DefaultListableBeanFactory();
        beans.registerSingleton("catalog", new com.aigameplatform.backend.service.curriculum.CurriculumCatalog(
                catalogDatasets, java.util.Set.of(GameType.QUIZ)));
        if (generator != null) {
            beans.registerSingleton("generator", generator);
        }
        if (curriculum != null) {
            beans.registerSingleton("curriculumContextProvider", curriculum);
        }
        try {
            var dataset = com.aigameplatform.backend.service.curriculum.CurriculumDataset.loadDefault();
            var constraints = com.aigameplatform.backend.service.curriculum.CurriculumConstraints.load(dataset);
            beans.registerSingleton("pilotQuizContentVerifier",
                    new PilotQuizContentVerifier(constraints, constraints.sha256()));
        } catch (IOException e) { throw new java.io.UncheckedIOException(e); }
        List<AbstractGameValidator> validators = new ArrayList<>(GameTestFixtures.schemaAndBusinessRuleValidators(MAPPER));
        validators.add(new SafetyGameValidator(
                new BlockedWordList(new ClassPathResource("moderation/blocked-words-vi.txt")), moderation, false));
        GameValidationService validation = new GameValidationService(validators, MAPPER);
        Random random = new Random(7);
        return new GameGenerationService(beans.getBeanProvider(GameContentGenerator.class),
                beans.getBeanProvider(PilotQuizContentVerifier.class),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)),
                new AiOutputValidator(MAPPER),
                GameTestFixtures.factoryRegistry(random),
                validation, MAPPER, beans.getBeanProvider(CurriculumContextProvider.class),
                beans.getBeanProvider(com.aigameplatform.backend.service.curriculum.CurriculumCatalog.class),
                beans.getBeanProvider(com.aigameplatform.backend.service.curriculum.CurriculumMetrics.class), ragEnabled, maxRetries);
    }

    private static GameGenerationService service(GameContentGenerator generator, int maxRetries) {
        return service(generator, maxRetries, moderation(false, false));
    }

    private static String validOutput(GameType type) throws IOException {
        return GameTestFixtures.resource("/ai-output-examples/", type);
    }

    private static String validArithmeticOutput() throws IOException {
        var output = (tools.jackson.databind.node.ObjectNode) MAPPER.readTree(validOutput(GameType.QUIZ));
        var first = (tools.jackson.databind.node.ObjectNode) output.path("questions").get(0);
        first.put("text", "Tính nhẩm: 2 + 3 = ?");
        first.put("correctIndex", 0);
        ((tools.jackson.databind.node.ArrayNode) first.path("options")).removeAll();
        ((tools.jackson.databind.node.ArrayNode) first.path("options")).add("5").add("4");
        var second = (tools.jackson.databind.node.ObjectNode) output.path("questions").get(1);
        second.put("text", "Tính nhẩm: 3 + 2 = ?");
        second.put("correctIndex", 0);
        ((tools.jackson.databind.node.ArrayNode) second.path("options")).removeAll();
        ((tools.jackson.databind.node.ArrayNode) second.path("options")).add("5").add("6");
        return MAPPER.writeValueAsString(output);
    }

    private static com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence math1Evidence(String chunkId) {
        try {
            var dataset = com.aigameplatform.backend.service.curriculum.CurriculumDataset.loadDefault();
            var chunk = new com.aigameplatform.backend.service.curriculum.CurriculumRAGService.RetrievedChunk(
                    chunkId, Subject.MATH, GradeLevel.GRADE_1, "Addition", "Curriculum outcome", 0.9,
                    dataset.source().sourceDocument(), List.of(1), List.of(1), dataset.source().curriculumVersion());
            return com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(dataset.source(), "fixture", List.of(chunk));
        } catch (IOException e) { throw new java.io.UncheckedIOException(e); }
    }

    // ---- thành công ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void aValidAnswerOnTheFirstTryBecomesAFullGame(GameType type) throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(type));

        GameDsl game = service(generator, 2).generate(type, REQUEST);

        assertThat(game.gameType()).isEqualTo(type);
        assertThat(game.metadata().gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void theFirstRequestCarriesTheTeacherInputAndTheSchemaButNoFeedback() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ));

        service(generator, 2).generate(GameType.QUIZ, REQUEST);

        GenerationAttempt first = generator.attempts.get(0);
        assertThat(first.attemptNumber()).isEqualTo(1);
        assertThat(first.isRetry()).isFalse();
        assertThat(first.topic()).isEqualTo("Đếm con vật");
        assertThat(first.subject()).isEqualTo(Subject.MATH);
        assertThat(first.gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(first.structuredSchema()).isEqualTo(new QuizGameStrategy(MAPPER).getStructuredSchema());
        assertThat(first.previousOutput()).isNull();
        assertThat(first.previousErrors()).isEmpty();
    }

    // ---- thử lại có phản hồi lỗi ----

    @Test
    void aWrongAnswerIsSentBackWithItsErrorsAndTheNextTryCanSucceed() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator("{\"questions\":[]}", validOutput(GameType.QUIZ));

        GameDsl game = service(generator, 2).generate(GameType.QUIZ, REQUEST);

        assertThat(game.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(generator.attempts).hasSize(2);
        GenerationAttempt second = generator.attempts.get(1);
        assertThat(second.attemptNumber()).isEqualTo(2);
        assertThat(second.isRetry()).isTrue();
        assertThat(second.previousOutput()).isEqualTo("{\"questions\":[]}");
        assertThat(second.previousErrors()).isNotEmpty();
    }

    @Test
    void curriculumEvidenceIsRetrievedOnceAndKeptUnchangedAcrossRetries() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator("{\"questions\":[]}", validArithmeticOutput());
        List<String> requestedTopics = new ArrayList<>();
        CurriculumContextProvider curriculum = (topic, subject, grade) -> {
            requestedTopics.add(topic);
            return CurriculumContextProvider.Evidence.found("[math-g1-007] Addition", math1Evidence("math-g1-007"));
        };
        service(generator, 2, moderation(false, false), curriculum, true).generate(GameType.QUIZ, ARITHMETIC_REQUEST);
        assertThat(requestedTopics).containsExactly(ARITHMETIC_REQUEST.topic());
        assertThat(generator.attempts).hasSize(2);
        assertThat(generator.attempts).extracting(GenerationAttempt::curriculumContext).containsOnly("[math-g1-007] Addition");
    }

    @Test
    void generationReturnsUnverifiedForQuestionFormsOutsideTheDeterministicPilot() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ));
        CurriculumContextProvider curriculum = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("[math-g1-001] Counting", math1Evidence("math-g1-001"));
        assertThatThrownBy(() -> service(generator, 0, moderation(false, false), curriculum, true)
                .generate(GameType.QUIZ, REQUEST))
                .isInstanceOfSatisfying(com.aigameplatform.backend.exception.GeneratedContentUnverifiedException.class,
                        exception -> {
                            assertThat(exception.getErrorCode()).isEqualTo(
                                    com.aigameplatform.backend.exception.ErrorCode.GENERATED_CONTENT_UNVERIFIED);
                            assertThat(exception.getMessage()).contains("QUESTION_NOT_MACHINE_CHECKABLE");
                        });
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void anUnverifiedDraftCanRetryButOnlyADeterministicallyVerifiedRetryIsReturned() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ), validArithmeticOutput());
        CurriculumContextProvider curriculum = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("[math-g1-007] Addition", math1Evidence("math-g1-007"));

        var result = service(generator, 1, moderation(false, false), curriculum, true)
                .generateResult(GameType.QUIZ, ARITHMETIC_REQUEST);

        assertThat(generator.attempts).hasSize(2);
        assertThat(generator.attempts.get(1).previousErrors()).extracting(e -> e.message())
                .contains("QUESTION_NOT_MACHINE_CHECKABLE");
        assertThat(result.review().reviewerModel()).isEqualTo("math-g1-quiz-deterministic-v1");
    }

    @Test
    void enabledRagReturnsUnverifiedWhenQuestionFormIsOutsideTheDeterministicPilot() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ));
        CurriculumContextProvider curriculum = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("[math-g1-001] Counting");
        assertThatThrownBy(() -> service(generator, 0, moderation(false, false), curriculum, true)
                .generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(com.aigameplatform.backend.exception.GeneratedContentUnverifiedException.class);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void aWrongExplicitArithmeticAnswerCannotBeApprovedByAReviewer() throws IOException {
        var gameOutput = (tools.jackson.databind.node.ObjectNode) MAPPER.readTree(validArithmeticOutput());
        var first = (tools.jackson.databind.node.ObjectNode) gameOutput.path("questions").get(0);
        first.put("correctIndex", 1);
        ScriptedGenerator generator = new ScriptedGenerator(MAPPER.writeValueAsString(gameOutput));
        CurriculumContextProvider curriculum = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("[math-g1-007] Addition", math1Evidence("math-g1-007"));
        assertThatThrownBy(() -> service(generator, 0, moderation(false, false), curriculum, true)
                .generate(GameType.QUIZ, ARITHMETIC_REQUEST)).isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(generator.attempts).hasSize(1);
    }
    @Test
    void insufficientCurriculumEvidenceStopsBeforeTheGeneratorIsCalled() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ));
        CurriculumContextProvider curriculum = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.insufficient();

        assertThatThrownBy(() -> service(generator, 2, moderation(false, false), curriculum, true)
                .generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class);

        assertThat(generator.attempts).isEmpty();
    }

    @Test
    void curriculumRetrievalErrorsFailClosedBeforeCallingTheGenerator() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ));
        CurriculumContextProvider curriculum = (topic, subject, grade) -> {
            throw new IllegalStateException("database unavailable");
        };

        assertThatThrownBy(() -> service(generator, 2, moderation(false, false), curriculum, true)
                .generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(CurriculumServiceUnavailableException.class)
                .hasMessageContaining("Không truy xuất được");
        assertThat(generator.attempts).isEmpty();
    }

    @Test
    void ragPilotRejectsSubjectsAndGradesOutsideItsReviewedDataset() {
        ScriptedGenerator generator = new ScriptedGenerator();
        CurriculumContextProvider curriculum = (topic, subject, grade) -> {
            throw new AssertionError("Unsupported scope must not retrieve");
        };
        GameDslRequest outOfScope = new GameDslRequest("alphabet", Subject.ENGLISH, GradeLevel.GRADE_1);

        assertThatThrownBy(() -> service(generator, 2, moderation(false, false), curriculum, true)
                .generate(GameType.QUIZ, outOfScope))
                .isInstanceOf(com.aigameplatform.backend.exception.GenerationScopeUnsupportedException.class)
                .hasMessageContaining("QUIZ");
        assertThat(generator.attempts).isEmpty();
    }

    @Test
    void enabledRagWithoutProviderIsReportedUnavailable() {
        ScriptedGenerator generator = new ScriptedGenerator();

        assertThatThrownBy(() -> service(generator, 2, moderation(false, false), null, true)
                .generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(CurriculumServiceUnavailableException.class)
                .hasMessageContaining("not configured");
        assertThat(generator.attempts).isEmpty();
    }

    @Test
    void ragPilotRejectsGameTypesOutsideQuiz() {
        ScriptedGenerator generator = new ScriptedGenerator();
        CurriculumContextProvider curriculum = (topic, subject, grade) ->
                CurriculumContextProvider.Evidence.found("some context");

        assertThatThrownBy(() -> service(generator, 2, moderation(false, false), curriculum, true)
                .generate(GameType.WORD_SCRAMBLE, REQUEST))
                .isInstanceOf(com.aigameplatform.backend.exception.GenerationScopeUnsupportedException.class)
                .hasMessageContaining("QUIZ");
        assertThat(generator.attempts).isEmpty();
    }

    @Test
    void textThatIsNotJsonIsAlsoRetried() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator("xin lỗi, tôi không làm được", validOutput(GameType.QUIZ));

        service(generator, 2).generate(GameType.QUIZ, REQUEST);

        assertThat(generator.attempts).hasSize(2);
        assertThat(generator.attempts.get(1).previousErrors()).extracting(e -> e.message())
                .anyMatch(message -> message.contains("JSON"));
    }

    @Test
    void givesUpAfterTheFirstTryPlusTwoRetries() {
        ScriptedGenerator generator = new ScriptedGenerator("{}", "{}", "{}");

        assertThatThrownBy(() -> service(generator, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasMessageContaining("3 lần");
        assertThat(generator.attempts).hasSize(3);
    }

    @Test
    void withZeroRetriesThereIsOnlyOneTry() {
        ScriptedGenerator generator = new ScriptedGenerator("{}");

        assertThatThrownBy(() -> service(generator, 0).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void onlyTheFirstTenErrorsAreSentBack() throws IOException {
        String manyErrors = "{\"questions\":[" + String.join(",", Collections.nCopies(15, "{}")) + "]}";
        ScriptedGenerator generator = new ScriptedGenerator(manyErrors, validOutput(GameType.QUIZ));

        service(generator, 2).generate(GameType.QUIZ, REQUEST);

        assertThat(generator.attempts.get(1).previousErrors()).hasSize(10);
    }

    // ---- không an toàn và dịch vụ không dùng được: không thử lại ----

    @Test
    void unsafeContentIsRejectedAtOnceWithoutAskingTheAiAgain() throws IOException {
        String unsafe = validOutput(GameType.QUIZ).replace("Có mấy con mèo?", "Địt mẹ con nào?");
        ScriptedGenerator generator = new ScriptedGenerator(unsafe, validOutput(GameType.QUIZ));

        assertThatThrownBy(() -> service(generator, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(UnsafeContentException.class);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void whenModerationCannotBeCheckedTheResultIsATimeoutWithoutRetrying() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ), validOutput(GameType.QUIZ));

        assertThatThrownBy(() -> service(generator, 2, moderation(true, true)).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasMessageContaining("an toàn");
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void aFailingAiServiceIsATimeoutAndKeepsTheCause() {
        AiServiceUnavailableException failure = new AiServiceUnavailableException("hết quota");
        ScriptedGenerator generator = new ScriptedGenerator(failure);

        assertThatThrownBy(() -> service(generator, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasCause(failure);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void aMissingAiImplementationFailsClearlyInsteadOfAtStartup() {
        assertThatThrownBy(() -> service(null, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasMessageContaining("Chưa cấu hình");
    }

    @Test
    void aNegativeRetryCountIsRejected() {
        assertThatThrownBy(() -> service(new ScriptedGenerator(), -1)).isInstanceOf(IllegalArgumentException.class);
    }
}
