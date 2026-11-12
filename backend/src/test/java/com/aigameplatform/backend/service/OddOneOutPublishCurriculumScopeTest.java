package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.CurriculumRAGService.RetrievedChunk;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.generation.GeneratedContentReviewer;
import com.aigameplatform.backend.service.media.SceneImageLoader;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class OddOneOutPublishCurriculumScopeTest {
    private final GameRepository games = mock(GameRepository.class);
    private final GameValidationService validation = mock(GameValidationService.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    @SuppressWarnings("rawtypes")
    private final GameContentStrategy strategy = mock(GameContentStrategy.class);
    private final GameCurriculumReviewService reviews = mock(GameCurriculumReviewService.class);
    private final GeneratedContentReviewer reviewer = mock(GeneratedContentReviewer.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<GeneratedContentReviewer> reviewers = mock(ObjectProvider.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final Game game = new Game();
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.invalid", "session-1");
    private final OddOneOutGameDsl dsl = new OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT, OddOneOutMode.IMAGE,
            new GameMetadata("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây"),
            new GameplaySettings(1.5), List.of());
    private final GamePublicationService service = new GamePublicationService(games, validation, strategies,
            mock(SceneImageLoader.class), reviews, reviewers, mapper, true,
            "http://localhost:5173", "http://localhost:5173/play");

    @BeforeEach void setup() {
        Teacher owner = new Teacher();
        owner.setId("teacher-1");
        game.setId("game-1");
        game.setAuthor(owner);
        game.setGameType(GameType.ODD_ONE_OUT);
        game.setStatus(GameStatus.DRAFT);
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(strategies.get(GameType.ODD_ONE_OUT)).thenReturn(strategy);
        when(strategy.toGameDsl(game)).thenReturn(dsl);
        when(validation.validate(any(JsonNode.class))).thenReturn(new ValidationReport(List.of(), dsl));
    }

    @Test void rejectsEvidenceFromAnotherSubjectBeforeCallingReviewer() {
        givenEvidence(List.of(chunk(Subject.MATH, GradeLevel.GRADE_1)));
        assertRejected();
    }

    @Test void rejectsEvidenceFromAnotherGradeBeforeCallingReviewer() {
        givenEvidence(List.of(chunk(Subject.VIETNAMESE, GradeLevel.GRADE_2)));
        assertRejected();
    }

    @Test void rejectsMixedEvidenceEvenWhenOneChunkMatches() {
        givenEvidence(List.of(chunk(Subject.VIETNAMESE, GradeLevel.GRADE_1), chunk(Subject.MATH, GradeLevel.GRADE_1)));
        assertRejected();
    }

    @Test void matchingScopeContinuesToSemanticReview() {
        givenEvidence(List.of(chunk(Subject.VIETNAMESE, GradeLevel.GRADE_1)));
        when(reviewers.getIfAvailable()).thenReturn(reviewer);
        when(reviewer.review(any(), any(), any())).thenReturn(new GeneratedContentReviewer.Result(List.of(),
                new CurriculumEvidenceReview(CurriculumEvidenceReview.Status.PENDING,
                        List.of(Map.of("questionId", "q1")), List.of(), "test-reviewer")));
        when(strategy.parseToQuestions(dsl)).thenReturn(List.of());
        when(games.findByShareCode(any())).thenReturn(Optional.empty());
        when(games.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));

        service.publish("game-1", null, teacher);

        verify(reviewer).review(any(), any(), any());
        assertThat(game.getStatus()).isEqualTo(GameStatus.PUBLISHED);
    }

    private void givenEvidence(List<RetrievedChunk> chunks) {
        var evidence = new CurriculumEvidence("source", "sha", "dataset", "curriculum", "model", chunks);
        when(reviews.getForTeacher("game-1", "teacher-1")).thenReturn(new GameCurriculumReviewService.ReviewView(
                UUID.randomUUID(), "game-1", Instant.EPOCH, CurriculumEvidenceReview.Status.STALE,
                mapper.valueToTree(evidence), mapper.valueToTree(List.of()), mapper.valueToTree(List.of()),
                "dataset", "curriculum", "model", null));
    }

    private RetrievedChunk chunk(Subject subject, GradeLevel grade) {
        return new RetrievedChunk("outcome-1", subject, grade, "Trái cây", "Nhận biết trái cây", 0.9,
                "source", List.of(1), List.of(1), "curriculum");
    }

    private void assertRejected() {
        assertThatThrownBy(() -> service.publish("game-1", null, teacher))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class);
        verify(reviewer, never()).review(any(), any(), any());
        verify(games, never()).saveAndFlush(any());
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }
}
