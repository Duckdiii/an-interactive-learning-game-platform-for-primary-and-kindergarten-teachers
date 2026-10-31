package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Opt-in smoke against the configured Supabase corpus and Gemini API; disabled in normal test runs. */
@EnabledIfEnvironmentVariable(named = "RUN_LIVE_RAG_GENERATION_SMOKE", matches = "true")
@SpringBootTest(properties = {
        "app.moderation.required=false",
        "app.curriculum-rag.enabled=true",
        "app.ai.gemini.game-generation.enabled=true",
        "app.generation.max-retries=1"
})
class CurriculumRagGeminiLiveSmokeTest {

    @Autowired
    private GameGenerationService generation;

    @Test
    void inCorpusTopicGeneratesAQuiz() throws Exception {
        var result = generation.generateResult(GameType.QUIZ,
                new GameDslRequest("Phép cộng nhẩm trong phạm vi 10", Subject.MATH, GradeLevel.GRADE_1));
        var game = result.game();

        assertThat(game.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(game.metadata().subject()).isEqualTo(Subject.MATH);
        assertThat(game.metadata().gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(game.questions()).hasSize(4);
        assertThat(result.evidence().chunks()).isNotEmpty()
                .allSatisfy(chunk -> {
                    assertThat(chunk.subject()).isEqualTo(Subject.MATH);
                    assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
                    assertThat(chunk.chunkId()).isNotBlank();
                    assertThat(chunk.pdfPages()).isNotEmpty();
                });
        assertThat(((QuizGameDsl) game).questions()).allSatisfy(question -> {
            assertThat(question.questionText()).isNotBlank();
            assertThat(question.options()).hasSizeGreaterThanOrEqualTo(2);
            assertThat(question.options()).extracting(option -> option.id())
                    .contains(question.correctOptionId());
        });
        Path artifact = Path.of("target", "rag-eval-local", "live-generated-game.json");
        Files.createDirectories(artifact.getParent());
        Files.writeString(artifact, new tools.jackson.databind.json.JsonMapper()
                .writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
                        "game", game, "curriculumEvidence", result.evidence())), StandardCharsets.UTF_8);
    }

    @Test
    void outOfCorpusTopicIsRejectedBeforeGeneration() {
        assertThatThrownBy(() -> generation.generate(GameType.QUIZ,
                new GameDslRequest("Lập trình vòng lặp Python", Subject.MATH, GradeLevel.GRADE_1)))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class);
    }
}
