package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.service.factory.GameDslRequest;
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
    void inCorpusTopicGeneratesAQuiz() {
        var game = generation.generate(GameType.QUIZ,
                new GameDslRequest("Phép cộng nhẩm trong phạm vi 10", Subject.MATH, GradeLevel.GRADE_1));

        assertThat(game.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(game.metadata().subject()).isEqualTo(Subject.MATH);
        assertThat(game.metadata().gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(game.questions()).hasSize(4);
    }

    @Test
    void outOfCorpusTopicIsRejectedBeforeGeneration() {
        assertThatThrownBy(() -> generation.generate(GameType.QUIZ,
                new GameDslRequest("Lập trình vòng lặp Python", Subject.MATH, GradeLevel.GRADE_1)))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class);
    }
}
