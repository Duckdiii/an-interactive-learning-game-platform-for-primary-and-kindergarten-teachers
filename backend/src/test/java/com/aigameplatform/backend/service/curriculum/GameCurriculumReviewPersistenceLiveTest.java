package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.aigameplatform.backend.dto.dsl.*;
import com.aigameplatform.backend.entity.*;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.repository.*;
import com.aigameplatform.backend.service.curriculum.review.*;
import com.aigameplatform.backend.service.generation.GenerationResult;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.json.JsonMapper;

/** Creates and removes its own synthetic fixtures; validates actual transaction rollback on PostgreSQL. */
@EnabledIfEnvironmentVariable(named = "RUN_LIVE_REVIEW_PERSISTENCE_TEST", matches = "true")
@SpringBootTest(properties = {"app.moderation.required=false", "app.curriculum-rag.enabled=false",
        "app.ai.gemini.game-generation.enabled=false"})
class GameCurriculumReviewPersistenceLiveTest {
    @Autowired GameCurriculumReviewService service;
    @Autowired GameRepository games;
    @Autowired TeacherRepository teachers;
    @MockitoSpyBean GameCurriculumReviewRepository reviews;
    private Teacher teacher;
    private Game game;
    private GenerationResult result;

    @BeforeEach void fixture() throws Exception {
        teacher = new Teacher();
        teacher.setEmail("review-acceptance-" + UUID.randomUUID() + "@example.invalid");
        teacher.setFullName("Synthetic review transaction fixture");
        teacher.setPasswordHash("not-a-login-credential");
        teacher = teachers.saveAndFlush(teacher);
        QuizGameDsl dsl;
        try (var stream = getClass().getResourceAsStream("/dsl-examples/quiz.json")) {
            dsl = (QuizGameDsl) new JsonMapper().readValue(stream, GameDsl.class);
        }
        game = new Game(); game.setAuthor(teacher); game.setTitle(dsl.metadata().title());
        game.setGameType(dsl.gameType()); game.setGrade(dsl.metadata().gradeLevel()); game.setSubject(dsl.metadata().subject());
        game.setSchemaVersion(dsl.schemaVersion()); game.setQuestionNum(dsl.questions().size());
        for (int i = 0; i < dsl.questions().size(); i++) {
            var question = dsl.questions().get(i); var entity = new QuizQuestion();
            entity.setItemIndex(i); entity.setText(question.questionText());
            entity.setTimeLimit(question.timeLimitSeconds()); entity.setPoint(question.points());
            entity.setOptions(question.options().stream().map(TextChoiceDsl::text).toList());
            for (int j = 0; j < question.options().size(); j++)
                if (question.options().get(j).id().equals(question.correctOptionId())) entity.setCorrectIndex(j);
            game.getQuestions().add(entity);
        }
        var source = new CurriculumSource("fixture.pdf", "a".repeat(64), "fixture-curriculum-v1", "fixture-v1", 1);
        var chunk = new CurriculumRAGService.RetrievedChunk("fixture-outcome", dsl.metadata().subject(), dsl.metadata().gradeLevel(),
                "Fixture topic", "Fixture outcome", 0.9, "fixture.pdf", List.of(1), List.of(1), "fixture-curriculum-v1");
        result = new GenerationResult(dsl, CurriculumEvidence.from(source, "fixture-model", List.of(chunk)), CurriculumEvidenceReview.unavailable());
    }

    @AfterEach void cleanup() {
        if (game != null && game.getId() != null) games.deleteById(game.getId());
        if (teacher != null && teacher.getId() != null) teachers.deleteById(teacher.getId());
    }

    @Test void evidenceIsJsonbAndEditingMakesReviewStale() {
        service.saveWithGame(game, result, teacher.getId());
        var review = service.getForTeacher(game.getId(), teacher.getId());
        assertThat(review.evidence().path("chunks").get(0).path("chunkId").asString()).isEqualTo("fixture-outcome");
        assertThat(review.datasetVersion()).isEqualTo("fixture-v1");
        assertThat(review.status()).isEqualTo(CurriculumEvidenceReview.Status.UNAVAILABLE);
        assertThatThrownBy(() -> service.getForTeacher(game.getId(), "another-teacher")).isInstanceOf(com.aigameplatform.backend.exception.ApiException.class);
        game.setTitle("Edited fixture game");
        service.saveEditedGame(game, teacher.getId());
        var edited = service.getForTeacher(game.getId(), teacher.getId());
        assertThat(edited.status()).isEqualTo(CurriculumEvidenceReview.Status.STALE);
        assertThat(edited.warnings().get(0).asString()).isEqualTo("GAME_CHANGED_REVIEW_STALE");
    }

    @Test void reviewWriteFailureRollsBackPreviouslyFlushedGame() {
        doThrow(new DataIntegrityViolationException("Synthetic review persistence failure"))
                .when(reviews).saveAndFlush(any(GameCurriculumReview.class));
        assertThatThrownBy(() -> service.saveWithGame(game, result, teacher.getId())).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(game.getId()).isNotBlank();
        assertThat(games.findById(game.getId())).isEmpty();
    }
}
