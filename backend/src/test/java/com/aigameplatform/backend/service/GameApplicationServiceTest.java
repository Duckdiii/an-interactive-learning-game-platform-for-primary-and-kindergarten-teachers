package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.generation.GenerationResult;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.json.JsonMapper;

class GameApplicationServiceTest {
    @Test
    void oddImageGenerationDoesNotRequireSceneAndSetsImageModeOnDraft() {
        var generation = mock(GameGenerationService.class);
        var teachers = mock(TeacherRepository.class);
        var reviews = mock(GameCurriculumReviewService.class);
        var strategies = mock(GameContentStrategyRegistry.class);
        var provider = mock(ObjectProvider.class);
        var teacher = new Teacher(); teacher.setId("teacher-1");
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        var question = new com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl("q1", 30, 10,
                null, null, null, null, List.of(
                new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("a", "Táo", "apple", "/assets/noto/emoji_u1f34e.svg"),
                new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("b", "Chuối", "banana", "/assets/noto/emoji_u1f34c.svg"),
                new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("c", "Nho", "grapes", "/assets/noto/emoji_u1f347.svg"),
                new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("d", "Cà rốt", "carrot", "/assets/noto/emoji_u1f955.svg")),
                "d", "Hình nào không phải trái cây?");
        var dsl = new com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT,
                com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE,
                new GameMetadata("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây"),
                new GameplaySettings(1), List.of(question));
        var request = new com.aigameplatform.backend.service.factory.GameDslRequest("Trái cây và rau củ",
                Subject.VIETNAMESE, GradeLevel.GRADE_1, null, null, VisualClozeMode.IMAGE, null, null);
        var result = new GenerationResult(dsl, CurriculumEvidence.empty(), CurriculumEvidenceReview.unavailable());
        when(generation.generateResult(GameType.ODD_ONE_OUT, request)).thenReturn(result);
        var strategy = new com.aigameplatform.backend.service.strategy.OddOneOutGameStrategy(JsonMapper.builder().build());
        org.mockito.Mockito.doReturn(strategy).when(strategies).get(GameType.ODD_ONE_OUT);
        when(reviews.saveWithGame(any(Game.class), eq(result), eq("teacher-1"))).thenAnswer(invocation -> {
            Game game = invocation.getArgument(0);
            assertThat(game.getOddOneOutMode()).isEqualTo(com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE);
            game.setId("game-1");
            return game;
        });
        var service = new GameApplicationService(generation, teachers, reviews, strategies,
                (ObjectProvider<CurriculumCatalog>) provider, JsonMapper.builder().build());
        var input = new GenerateGameRequest(Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây và rau củ", false,
                GameType.ODD_ONE_OUT, VisualClozeMode.IMAGE, null, null, null);
        assertThat(service.generate(input, new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1"))
                .path("mode").asString()).isEqualTo("IMAGE");
    }

    @Test
    void imageGenerationPersistsDraftOwnedByAuthenticatedTeacher() {
        var generation = mock(GameGenerationService.class);
        var teachers = mock(TeacherRepository.class);
        var curriculumReviews = mock(GameCurriculumReviewService.class);
        var strategies = mock(GameContentStrategyRegistry.class);
        var provider = mock(ObjectProvider.class);
        var strategy = mock(GameContentStrategy.class);
        var teacher = new Teacher(); teacher.setId("teacher-1");
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(teacher));
        var dsl = imageDsl();
        var optionImages = List.of(new GenerateGameRequest.OptionImage("https://scene.example/cat.png", "cat"),
                new GenerateGameRequest.OptionImage("https://scene.example/dog.png", "dog"));
        var request = new com.aigameplatform.backend.service.factory.GameDslRequest(
                "Find animals", Subject.MATH, GradeLevel.GRADE_1, null, null, VisualClozeMode.IMAGE,
                "https://scene.example/scene.png", optionImages);
        var generationResult = new GenerationResult(dsl, CurriculumEvidence.empty(), CurriculumEvidenceReview.unavailable());
        when(generation.generateResult(GameType.VISUAL_CLOZE, request)).thenReturn(generationResult);
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        when(strategy.parseToQuestions(dsl)).thenReturn(List.of());
        when(curriculumReviews.saveWithGame(any(Game.class), eq(generationResult), eq("teacher-1"))).thenAnswer(invocation -> {
            Game saved = invocation.getArgument(0);
            saved.setId("game-1");
            return saved;
        });
        var service = new GameApplicationService(generation, teachers, curriculumReviews, strategies,
                (ObjectProvider<CurriculumCatalog>) provider, JsonMapper.builder().build());
        var input = new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, "Find animals", false,
                GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE, "https://scene.example/scene.png", optionImages, null);

        var response = service.generate(input, new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1"));

        assertThat(response.get("gameId").asString()).isEqualTo("game-1");
        assertThat(response.get("status").asString()).isEqualTo("DRAFT");
        assertThat(response.get("mode").asString()).isEqualTo("IMAGE");
        var missingAssets = new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, "Find animals", false,
                GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE, "https://scene.example/scene.png", null, null);
        assertThatThrownBy(() -> service.generate(missingAssets,
                new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1")))
                .hasMessageContaining("optionImages");
    }

    private static VisualClozeGameDsl imageDsl() {
        var question = new VisualClozeQuestionDsl("q1", 45, 100, null, null, null, null, null, null, null,
                "Find animals", "https://scene.example/scene.png", 800, 600,
                List.of(new VisualClozeBlankDsl("b1", 200, 200, "o1")),
                List.of(new VisualClozeImageOptionDsl("o1", "cat", "https://scene.example/cat.png"),
                        new VisualClozeImageOptionDsl("o2", "dog", "https://scene.example/dog.png")));
        return new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Find animals", Subject.MATH, GradeLevel.GRADE_1, "Find animals"),
                new GameplaySettings(1.5), List.of(question));
    }
}
