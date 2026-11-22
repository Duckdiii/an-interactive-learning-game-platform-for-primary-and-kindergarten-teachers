package com.aigameplatform.backend.service.game;

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
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.generation.GenerationResult;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Chế độ hình ảnh khi sinh game DSL (chuyển từ GameApplicationService của main khi gộp vào GameService). */
class DslGameContentHandlerImageModeTest {

    private static final List<GenerateGameRequest.OptionImage> OPTION_IMAGES = List.of(
            new GenerateGameRequest.OptionImage("https://scene.example/cat.png", "cat"),
            new GenerateGameRequest.OptionImage("https://scene.example/dog.png", "dog"));

    private final GameGenerationService generation = mock(GameGenerationService.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    @SuppressWarnings("rawtypes")
    private final GameContentStrategy strategy = mock(GameContentStrategy.class);
    private final DslGameContentHandler handler = new DslGameContentHandler(generation, mock(GameValidationService.class),
            strategies, JsonMapper.builder().build());

    private static GenerateGameRequest request(GameType type, String sceneUrl, List<GenerateGameRequest.OptionImage> images) {
        return new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, "Find animals", false, type,
                VisualClozeMode.IMAGE, sceneUrl, images, null);
    }

    private static GenerationResult result(Object dsl) {
        return new GenerationResult((com.aigameplatform.backend.dto.dsl.GameDsl) dsl, CurriculumEvidence.empty(),
                CurriculumEvidenceReview.unavailable());
    }

    @Test
    @SuppressWarnings("unchecked")
    void visualClozeImageGenerationPassesTheTeacherImagesAndMarksTheGameImageMode() {
        var dsl = visualClozeImageDsl();
        var expected = new GameDslRequest("Find animals", Subject.MATH, GradeLevel.GRADE_1, null, null,
                VisualClozeMode.IMAGE, "https://scene.example/scene.png", OPTION_IMAGES);
        when(generation.generateResult(GameType.VISUAL_CLOZE, expected)).thenReturn(result(dsl));
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        when(strategy.parseToQuestions(dsl)).thenReturn(List.of());

        var content = handler.generate(GameType.VISUAL_CLOZE, "Find animals",
                request(GameType.VISUAL_CLOZE, "https://scene.example/scene.png", OPTION_IMAGES));

        assertThat(content.visualClozeMode()).isEqualTo(VisualClozeMode.IMAGE);
        assertThat(content.oddOneOutMode()).isNull();
        assertThat(content.schemaVersion()).isEqualTo("1.1.0");
        assertThat(content.topic()).isEqualTo("Find animals");
    }

    @Test
    @SuppressWarnings("unchecked")
    void oddOneOutImageGenerationNeedsNoSceneAndMarksTheGameImageMode() {
        var dsl = oddImageDsl();
        when(generation.generateResult(any(), any())).thenReturn(result(dsl));
        when(strategies.get(GameType.ODD_ONE_OUT)).thenReturn(strategy);
        when(strategy.parseToQuestions(dsl)).thenReturn(List.of());

        var content = handler.generate(GameType.ODD_ONE_OUT, "Trái cây và rau củ", request(GameType.ODD_ONE_OUT, null, null));

        assertThat(content.oddOneOutMode()).isEqualTo(OddOneOutMode.IMAGE);
        assertThat(content.visualClozeMode()).isNull();
    }

    @Test
    void visualClozeImageModeWithoutTeacherOptionImagesIsRejectedBeforeCallingAi() {
        assertThatThrownBy(() -> handler.generate(GameType.VISUAL_CLOZE, "Find animals",
                request(GameType.VISUAL_CLOZE, "https://scene.example/scene.png", null)))
                .isInstanceOf(ApiException.class).hasMessageContaining("ảnh lựa chọn");
        assertThatThrownBy(() -> handler.generate(GameType.VISUAL_CLOZE, "Find animals",
                request(GameType.VISUAL_CLOZE, " ", OPTION_IMAGES)))
                .isInstanceOf(ApiException.class).hasMessageContaining("sceneImageUrl");
        assertThatThrownBy(() -> handler.generate(GameType.VISUAL_CLOZE, "Find animals",
                request(GameType.VISUAL_CLOZE, "https://scene.example/scene.png", List.of(OPTION_IMAGES.get(0), OPTION_IMAGES.get(0)))))
                .isInstanceOf(ApiException.class).hasMessageContaining("khác nhau");
        verify(generation, never()).generateResult(any(), any());
    }

    @Test
    void imageModeForAGameTypeWithoutOneIsRejected() {
        assertThatThrownBy(() -> handler.generate(GameType.QUIZ, "Find animals", request(GameType.QUIZ, null, null)))
                .isInstanceOf(ApiException.class).hasMessageContaining("chế độ hình ảnh");
        verify(generation, never()).generateResult(any(), any());
    }

    @Test
    void reviseByChatIsRejectedForImageModeGamesSoTheSceneIsNotLost() {
        var current = JsonMapper.builder().build().createObjectNode().put("gameType", "VISUAL_CLOZE").put("mode", "IMAGE")
                .put("schemaVersion", "1.1.0").put("gameId", "g1");
        assertThatThrownBy(() -> handler.revise(current, "Đổi sang chủ đề biển", List.of()))
                .isInstanceOf(ApiException.class).hasMessageContaining("chế độ hình ảnh");
        verify(generation, never()).revise(any(), any(), any());
    }

    private static VisualClozeGameDsl visualClozeImageDsl() {
        var question = new VisualClozeQuestionDsl("q1", 45, 100, null, null, null, null, null, null, null,
                "Find animals", "https://scene.example/scene.png", 800, 600,
                List.of(new VisualClozeBlankDsl("b1", 200, 200, "o1")),
                List.of(new VisualClozeImageOptionDsl("o1", "cat", "https://scene.example/cat.png"),
                        new VisualClozeImageOptionDsl("o2", "dog", "https://scene.example/dog.png")));
        return new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Find animals", Subject.MATH, GradeLevel.GRADE_1, "Find animals"),
                new GameplaySettings(1.5), List.of(question));
    }

    private static OddOneOutGameDsl oddImageDsl() {
        var question = new OddOneOutQuestionDsl("q1", 30, 10, null, null, null, null, List.of(
                new TextChoiceDsl("a", "Táo", "apple", "/assets/noto/emoji_u1f34e.svg"),
                new TextChoiceDsl("b", "Chuối", "banana", "/assets/noto/emoji_u1f34c.svg"),
                new TextChoiceDsl("c", "Nho", "grapes", "/assets/noto/emoji_u1f347.svg"),
                new TextChoiceDsl("d", "Cà rốt", "carrot", "/assets/noto/emoji_u1f955.svg")),
                "d", "Hình nào không phải trái cây?");
        return new OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT, OddOneOutMode.IMAGE,
                new GameMetadata("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây"),
                new GameplaySettings(1), List.of(question));
    }
}
