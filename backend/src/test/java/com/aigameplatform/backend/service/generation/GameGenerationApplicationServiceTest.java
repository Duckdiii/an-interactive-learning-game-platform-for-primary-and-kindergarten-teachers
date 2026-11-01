package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.aigameplatform.backend.dto.dsl.*;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import com.aigameplatform.backend.exception.GenerationScopeUnsupportedException;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.curriculum.review.*;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class GameGenerationApplicationServiceTest {
    @Test
    void generatesAndPersistsDslWithCurriculumReviewForAuthenticatedTeacher() {
        var teacher = new Teacher(); teacher.setId("teacher-1");
        var teachers = mock(TeacherRepository.class);
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        var game = quiz();
        var generation = mock(GameGenerationService.class);
        var evidence = CurriculumEvidence.empty();
        var review = CurriculumEvidenceReview.unavailable();
        when(generation.generateResult(GameType.QUIZ, new GameDslRequest("count objects", Subject.MATH, GradeLevel.GRADE_1)))
                .thenReturn(new GenerationResult(game, evidence, review));
        @SuppressWarnings("unchecked") var strategy = (GameContentStrategy<?, ?>) mock(GameContentStrategy.class);
        when(strategy.parseToQuestions(game)).thenReturn(List.of());
        var strategies = mock(GameContentStrategyRegistry.class);
        doReturn(strategy).when(strategies).get(GameType.QUIZ);
        var reviews = mock(GameCurriculumReviewService.class);
        when(reviews.saveWithGame(any(Game.class), any(GenerationResult.class), eq("teacher-1")))
                .thenAnswer(call -> { Game saved = call.getArgument(0); saved.setId("game-1"); return saved; });

        var result = new GameGenerationApplicationService(generation, teachers, strategies, reviews,
                readyCatalogProvider(), true)
                .generateAndSave(GameType.QUIZ, new GameDslRequest("count objects", Subject.MATH, GradeLevel.GRADE_1), "teacher-1");

        assertThat(result.gameId()).isEqualTo("game-1");
        assertThat(result.game()).isSameAs(game);
        assertThat(result.curriculum().review()).isSameAs(review);
        verify(reviews).saveWithGame(any(Game.class), any(GenerationResult.class), eq("teacher-1"));
    }

    @Test
    void unauthenticatedOrDeletedTeacherCannotTriggerGeneration() {
        var teachers = mock(TeacherRepository.class);
        when(teachers.findById("missing")).thenReturn(Optional.empty());
        var generation = mock(GameGenerationService.class);

        assertThatThrownBy(() -> new GameGenerationApplicationService(generation, teachers,
                mock(GameContentStrategyRegistry.class), mock(GameCurriculumReviewService.class),
                mock(ObjectProvider.class), true)
                .generateAndSave(GameType.QUIZ, new GameDslRequest("topic", Subject.MATH, GradeLevel.GRADE_1), "missing"))
                .isInstanceOf(ApiException.class);
        verifyNoInteractions(generation);
    }

    @Test
    void ragDisabledCannotCreateAnUngroundedDraft() {
        var teacher = new Teacher(); teacher.setId("teacher-1");
        var teachers = mock(TeacherRepository.class);
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        var generation = mock(GameGenerationService.class);
        var catalog = mock(ObjectProvider.class);

        assertThatThrownBy(() -> new GameGenerationApplicationService(generation, teachers,
                mock(GameContentStrategyRegistry.class), mock(GameCurriculumReviewService.class), catalog, false)
                .generateAndSave(GameType.QUIZ, new GameDslRequest("topic", Subject.MATH, GradeLevel.GRADE_1), "teacher-1"))
                .isInstanceOf(CurriculumServiceUnavailableException.class);
        verifyNoInteractions(generation, catalog);
    }

    @Test
    void unsupportedRuntimeScopeIsRejectedBeforeGeneration() {
        var teacher = new Teacher(); teacher.setId("teacher-1");
        var teachers = mock(TeacherRepository.class);
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        var generation = mock(GameGenerationService.class);
        @SuppressWarnings("unchecked") var provider = (ObjectProvider<CurriculumCatalog>) mock(ObjectProvider.class);
        var catalog = mock(CurriculumCatalog.class);
        when(provider.getIfAvailable()).thenReturn(catalog);
        doThrow(new GenerationScopeUnsupportedException("unsupported"))
                .when(catalog).requireSupported(GameType.QUIZ, Subject.ENGLISH, GradeLevel.GRADE_2);

        assertThatThrownBy(() -> new GameGenerationApplicationService(generation, teachers,
                mock(GameContentStrategyRegistry.class), mock(GameCurriculumReviewService.class), provider, true)
                .generateAndSave(GameType.QUIZ, new GameDslRequest("topic", Subject.ENGLISH, GradeLevel.GRADE_2), "teacher-1"))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
        verifyNoInteractions(generation);
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<CurriculumCatalog> readyCatalogProvider() {
        var provider = (ObjectProvider<CurriculumCatalog>) mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mock(CurriculumCatalog.class));
        return provider;
    }

    private static GameDsl quiz() {
        return new QuizGameDsl("1.0.0", GameType.QUIZ,
                new GameMetadata("Đếm đồ vật", Subject.MATH, GradeLevel.GRADE_1, "count objects"),
                new GameplaySettings(1.0), List.of());
    }
}
