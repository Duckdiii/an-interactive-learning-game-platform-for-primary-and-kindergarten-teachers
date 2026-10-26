package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.json.JsonMapper;

/** Opt-in smoke against the configured Supabase corpus and Gemini API; disabled in normal test runs. */
@EnabledIfEnvironmentVariable(named = "RUN_LIVE_RAG_GENERATION_SMOKE", matches = "true")
@SpringBootTest(properties = {
        "app.moderation.required=false",
        "app.curriculum-rag.enabled=true",
        "app.ai.gemini.game-generation.enabled=true",
        "app.generation.max-retries=1",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.datasource.hikari.read-only=true"
})
class CurriculumRagGeminiLiveSmokeTest {
    private static final List<Map<String, Object>> RESULTS = new ArrayList<>();
    private static final JsonMapper MAPPER = new JsonMapper();

    record LiveCase(String id, Subject subject, GradeLevel grade, String topic, boolean supported) { }

    static Stream<LiveCase> curriculumCases() throws Exception {
        var matrix = MAPPER.readTree(Files.readString(Path.of("..", "docs", "rag-spike", "results",
                "production-e2e-matrix.json"), StandardCharsets.UTF_8));
        var cases = new ArrayList<LiveCase>();
        for (var row : matrix.get("cases")) {
            cases.add(new LiveCase(row.get("caseId").asString(), Subject.valueOf(row.get("subject").asString()),
                    GradeLevel.valueOf(row.get("gradeLevel").asString()), row.get("topic").asString(),
                    "SUPPORTED".equals(row.get("caseKind").asString())));
        }
        assertThat(cases).hasSize(30);
        return cases.stream();
    }

    @Autowired
    private GameGenerationService generation;

    @ParameterizedTest(name = "{0}")
    @MethodSource("curriculumCases")
    void supportedAndInsufficientEvidenceAcrossAllFifteenScopes(LiveCase testCase) {
        var result = new LinkedHashMap<String, Object>();
        result.put("caseId", testCase.id());
        result.put("subject", testCase.subject());
        result.put("gradeLevel", testCase.grade());
        result.put("topic", testCase.topic());
        result.put("expectedEvidence", testCase.supported() ? "FOUND" : "INSUFFICIENT_EVIDENCE");
        result.put("teacherReview", "PENDING");
        result.put("manualContentReview", "NOT_REVIEWED");
        long started = System.nanoTime();
        try {
            var request = new GameDslRequest(testCase.topic(), testCase.subject(), testCase.grade());
            if (testCase.supported()) {
                var game = generation.generate(GameType.QUIZ, request);
                assertThat(game.gameType()).isEqualTo(GameType.QUIZ);
                assertThat(game.metadata().subject()).isEqualTo(testCase.subject());
                assertThat(game.metadata().gradeLevel()).isEqualTo(testCase.grade());
                assertThat(game.questions()).hasSize(4);
                assertThat(game.metadata().curriculumReview()).isNotNull();
                result.put("game", game);
                result.put("validation", "PASS_SCHEMA_BUSINESS_AND_SAFETY_CHAIN");
            } else {
                assertThatThrownBy(() -> generation.generate(GameType.QUIZ, request))
                        .isInstanceOf(CurriculumEvidenceNotFoundException.class);
                result.put("validation", "REJECTED_BEFORE_GENERATION");
            }
            result.put("runStatus", "PASS");
        } catch (RuntimeException | AssertionError failure) {
            result.put("runStatus", "FAIL");
            result.put("failureClass", failure.getClass().getSimpleName());
            throw failure;
        } finally {
            result.put("latencyMillis", (System.nanoTime() - started) / 1_000_000);
            RESULTS.add(result);
        }
    }

    @AfterAll
    static void saveLiveEvidence() throws Exception {
        Path output = Path.of("..", "docs", "rag-spike", "results");
        Files.createDirectories(output);
        String name = "live-generation-" + Instant.now().toString().replace(':', '-');
        Files.writeString(output.resolve(name + ".json"), MAPPER.writerWithDefaultPrettyPrinter()
                .writeValueAsString(Map.of("measurement", "REAL_SUPABASE_AND_GEMINI_SERVICE_INTEGRATION",
                        "model", System.getenv().getOrDefault("GEMINI_MODEL", "UNSET"), "cases", RESULTS,
                        "databaseWrites", false, "teacherReview", "PENDING")), StandardCharsets.UTF_8);
        var text = new StringBuilder("# Live curriculum generation matrix\n\nReal Supabase retrieval and Gemini through GameGenerationService. "
                + "Flyway disabled; database connections read-only. This is service integration, not an HTTP API test.\n\n"
                + "| Case | Subject | Grade | Result | Validation |\n|---|---|---|---|---|\n");
        for (var result : RESULTS) {
            text.append("| ").append(result.get("caseId")).append(" | ").append(result.get("subject"))
                    .append(" | ").append(result.get("gradeLevel")).append(" | ").append(result.get("runStatus"))
                    .append(" | ").append(result.getOrDefault("validation", result.get("failureClass"))).append(" |\n");
        }
        text.append("\nGenerated outputs require separate content review; teacher review remains pending.\n");
        Files.writeString(output.resolve(name + ".md"), text, StandardCharsets.UTF_8);
    }
}
