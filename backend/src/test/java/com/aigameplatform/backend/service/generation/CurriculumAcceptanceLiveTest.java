package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.*;
import com.aigameplatform.backend.service.curriculum.*;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import tools.jackson.databind.json.JsonMapper;

/** Explicit opt-in acceptance artifacts for synthetic inputs; never claims independent human labels. */
@EnabledIfEnvironmentVariable(named = "RUN_LIVE_RAG_ACCEPTANCE", matches = "true")
@SpringBootTest(properties = {"app.moderation.required=false", "app.curriculum-rag.enabled=true",
        "app.ai.gemini.game-generation.enabled=true", "app.generation.max-retries=2"})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CurriculumAcceptanceLiveTest {
    @Autowired GameGenerationService generation;
    @Autowired CurriculumRAGService retrieval;
    @Autowired CurriculumDataset dataset;
    @Autowired ContentModerationClient moderation;
    @Autowired RecordingContext recording;
    private final JsonMapper mapper = new JsonMapper();
    private final List<Map<String, Object>> generated = new ArrayList<>();
    private final Path output = Path.of("..", "docs", "rag-spike", "results",
            "acceptance-" + Instant.now().toString().replace(':', '-'));
    private static final List<String> GENERATION_TOPICS = List.of(
            "Đếm số con vật từ 1 đến 5", "Đếm số con vật từ 1 đến 10", "Đếm trong phạm vi 20",
            "Đọc các số trong phạm vi 20", "Viết các số trong phạm vi 100",
            "Cộng không nhớ trong phạm vi 100", "Trừ không nhớ trong phạm vi 100",
            "Cộng nhẩm trong phạm vi 10", "Trừ nhẩm trong phạm vi 10",
            "Cộng nhẩm các số tròn chục", "Trừ nhẩm các số tròn chục", "So sánh các số trong phạm vi 100",
            "Nhận biết hình vuông", "Nhận biết hình tròn", "Nhận biết hình tam giác", "Nhận biết hình chữ nhật",
            "Nhận biết khối lập phương", "Nhận biết khối hộp chữ nhật", "Đo độ dài bằng cm", "Đọc giờ đúng");

    static class RecordingContext {
        String context = "";
        int calls;
    }
    @TestConfiguration
    static class CaptureConfiguration {
        @Bean RecordingContext acceptanceRecordingContext() { return new RecordingContext(); }
        @Bean @Primary CurriculumContextProvider acceptanceRecordingProvider(
                @Qualifier("curriculumContextProvider") CurriculumContextProvider delegate, RecordingContext recording) {
            return (topic, subject, grade) -> {
                recording.calls++;
                var evidence = delegate.retrieve(topic, subject, grade);
                recording.context = evidence.context();
                return evidence;
            };
        }
    }

    @BeforeAll void prepare() throws Exception { Files.createDirectories(output); }

    @Test void exploratoryCasesKeepRetrievalAndDecisionMetricsSeparate() throws Exception {
        List<CurriculumBenchmark.Query> queries;
        try (var stream = getClass().getResourceAsStream("/curriculum/acceptance/exploratory.jsonl")) {
            assertThat(stream).isNotNull();
            queries = new String(stream.readAllBytes(), StandardCharsets.UTF_8).lines()
                    .filter(s -> !s.isBlank()).map(s -> mapper.readValue(s, CurriculumBenchmark.Query.class)).toList();
        }
        var rows = new ArrayList<CurriculumBenchmark.Row>();
        var errors = new ArrayList<Map<String, String>>();
        var constraints = CurriculumConstraints.load(dataset);
        for (var query : queries) {
            try { rows.addAll(CurriculumBenchmark.evaluate(retrieval, dataset, constraints, List.of(query))); }
            catch (RuntimeException e) { errors.add(Map.of("queryId", query.queryId(), "errorType", e.getClass().getSimpleName())); }
        }
        var report = new LinkedHashMap<String, Object>();
        report.put("evaluationType", "AI_AUTHORED_EXPLORATORY_NOT_INDEPENDENT_HOLDOUT");
        report.put("labelsReview", "PENDING_HUMAN_REVIEW");
        report.put("releaseAccepted", false);
        report.put("dataset", dataset.source());
        report.put("constraintsSha256", constraints.sha256());
        report.put("requestedQueries", queries.size());
        report.put("completedQueries", rows.size());
        report.put("errors", errors);
        report.put("summary", CurriculumBenchmark.summarize(rows));
        report.put("cohorts", CurriculumBenchmark.summarizeCohorts(rows));
        report.put("rows", rows);
        write("exploratory-retrieval.json", report);
        assertThat(errors).as("Provider errors are not correct negative rejections").isEmpty();
        assertThat(rows).hasSize(90);
        assertThat(CurriculumBenchmark.summarize(rows).qualityGatePassed()).as("Exploratory quality target; not a human acceptance gate").isTrue();
    }

    @TestFactory Stream<DynamicTest> generateTwentyReviewableSamples() {
        return java.util.stream.IntStream.range(0, GENERATION_TOPICS.size()).mapToObj(index -> DynamicTest.dynamicTest(
                "sample-" + (index + 1), () -> {
                    String topic = GENERATION_TOPICS.get(index);
                    var entry = new LinkedHashMap<String, Object>();
                    entry.put("sampleId", "sample-" + (index + 1));
                    entry.put("topic", topic);
                    entry.put("moderationMode", moderation.isConfigured() ? "OPENAI" : "BLOCKLIST_ONLY");
                    entry.put("humanReview", "PENDING");
                    recording.calls = 0; recording.context = "";
                    long start = System.nanoTime();
                    try {
                        var game = generation.generate(GameType.QUIZ, new GameDslRequest(topic, Subject.MATH, GradeLevel.GRADE_1));
                        entry.put("status", "GENERATED");
                        entry.put("game", game);
                        entry.put("retrievedContext", recording.context);
                        assertThat(game).isInstanceOf(QuizGameDsl.class);
                        assertThat(((QuizGameDsl) game).questions()).hasSize(4);
                        assertThat(recording.calls).as("Retrieval is once even when generation retries").isEqualTo(1);
                        assertThat(recording.context).isNotBlank();
                    } catch (RuntimeException | AssertionError error) {
                        entry.put("status", "FAILED");
                        entry.put("errorType", error.getClass().getSimpleName());
                        if (error instanceof ApiException api) entry.put("errorCode", api.getErrorCode().name());
                        throw error;
                    } finally {
                        entry.put("elapsedMillis", (System.nanoTime() - start) / 1_000_000);
                        generated.add(entry);
                        write("sample-" + (index + 1) + ".json", entry);
                    }
                }));
    }

    @Test void unsupportedScopeStopsBeforeContextAndGeneration() {
        int before = recording.calls;
        assertThatThrownBy(() -> generation.generate(GameType.QUIZ,
                new GameDslRequest("Đếm từ 1 đến 5", Subject.MATH, GradeLevel.KINDERGARTEN)))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
        assertThat(recording.calls).isEqualTo(before);
    }

    @AfterAll void report() throws Exception {
        var summary = new LinkedHashMap<String, Object>();
        summary.put("measuredAtUtc", Instant.now().toString());
        summary.put("pipeline", "A_EXISTING_VECTOR_TYPED_VERIFIER");
        summary.put("moderationMode", moderation.isConfigured() ? "OPENAI" : "BLOCKLIST_ONLY");
        summary.put("generated", generated.stream().filter(e -> "GENERATED".equals(e.get("status"))).count());
        summary.put("failed", generated.stream().filter(e -> "FAILED".equals(e.get("status"))).count());
        summary.put("humanReview", "PENDING");
        summary.put("independentHoldout", "NOT_AVAILABLE");
        summary.put("releaseAccepted", false);
        summary.put("samples", generated);
        write("generation-summary.json", summary);
        System.out.println("Acceptance artifacts: " + output.toAbsolutePath().normalize());
    }
    private void write(String name, Object value) throws Exception {
        Files.writeString(output.resolve(name), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(value), StandardCharsets.UTF_8);
    }
}
