package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.media.LoadedSceneImage;
import com.aigameplatform.backend.service.media.SceneImageLoader;
import com.aigameplatform.backend.service.media.SceneImageUnavailableException;
import com.aigameplatform.backend.service.media.InvalidSceneImageException;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GamePublicationServiceTest {
    private final GameRepository games = mock(GameRepository.class);
    private final GameValidationService validation = mock(GameValidationService.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final GameContentStrategy strategy = mock(GameContentStrategy.class);
    private final SceneImageLoader images = mock(SceneImageLoader.class);
    private final com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService reviews =
            mock(com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService.class);
    private final com.aigameplatform.backend.service.generation.GeneratedContentReviewer reviewer =
            mock(com.aigameplatform.backend.service.generation.GeneratedContentReviewer.class);
    private final org.springframework.beans.factory.ObjectProvider<com.aigameplatform.backend.service.generation.GeneratedContentReviewer> reviewerProvider =
            mock(org.springframework.beans.factory.ObjectProvider.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final Game game = new Game();
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");
    private final VisualClozeGameDsl dsl = imageDsl();
    private final GamePublicationService service = new GamePublicationService(games, validation, strategies, images, reviews,
            reviewerProvider, mapper, false,
            "http://localhost:5173", "https://play.example/room/");

    GamePublicationServiceTest() {
        Teacher owner = new Teacher(); owner.setId("teacher-1");
        game.setId("game-1"); game.setAuthor(owner); game.setGameType(GameType.VISUAL_CLOZE);
        game.setStatus(GameStatus.DRAFT);
    }

    @BeforeEach
    void setup() throws Exception {
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(games.findByShareCode(any())).thenReturn(Optional.empty());
        when(games.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviews.saveEditedGame(any(), eq("teacher-1"))).thenAnswer(invocation -> invocation.getArgument(0));
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), dsl));
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        when(strategy.parseToQuestions(dsl)).thenReturn(List.of());
        when(images.load(any(), any())).thenReturn(new LoadedSceneImage(new byte[] {1}, "image/png", 800, 600));
        when(reviewerProvider.getIfAvailable()).thenReturn(reviewer);
        var accepted = new com.aigameplatform.backend.service.generation.GeneratedContentReviewer.Result(
                List.of(), com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable(), true);
        when(reviewer.review(any(), any(), any())).thenReturn(accepted);
        when(reviewer.review(any(), any(), any(), any(), any())).thenReturn(accepted);
    }

    @Test
    void publishChecksSceneDimensionsThenSetsPublishedAndReturnsStableShareUrl() {
        var result = service.publish("game-1", mapper.createObjectNode(), teacher);

        assertThat(game.getStatus()).isEqualTo(GameStatus.PUBLISHED);
        assertThat(game.getVisualClozeMode()).isEqualTo(VisualClozeMode.IMAGE);
        assertThat(result.get("shareUrl")).asString().startsWith("https://play.example/room/");
        assertThat(result.get("shareCode").toString()).hasSize(6);
        verify(images).load(java.net.URI.create("https://scene.example/scene.png"), "http://localhost:5173");
        verify(reviews).saveEditedGame(game, "teacher-1");
    }

    @Test
    void publishingUnchangedDraftDoesNotMarkItsReviewStale() {
        when(strategy.toGameDsl(game)).thenReturn(dsl);
        service.publish("game-1", mapper.valueToTree(dsl), teacher);
        verify(reviews, never()).saveEditedGame(any(), any());
        verify(games).saveAndFlush(game);
    }

    @Test
    void teacherCanLoadOwnedDraftForExistingWorkspaceRoute() {
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        when(strategy.toGameDsl(game)).thenReturn(dsl);

        var result = service.getGame("game-1", teacher);

        assertThat(result.get("gameId").asString()).isEqualTo("game-1");
        assertThat(result.get("status").asString()).isEqualTo("DRAFT");
        assertThat(result.get("mode").asString()).isEqualTo("IMAGE");
    }

    @Test
    void teacherCanSaveValidatedDraftThroughExistingWorkspaceRoute() {
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), dsl));
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        when(strategy.parseToQuestions(dsl)).thenReturn(List.of());
        when(games.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.saveDraft("game-1", mapper.valueToTree(dsl), teacher);

        assertThat(result.get("mode").asString()).isEqualTo("IMAGE");
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(reviews).saveEditedGame(game, "teacher-1");
    }

    @Test
    void savingUnchangedDraftDoesNotMarkReviewStale() {
        when(strategy.toGameDsl(game)).thenReturn(dsl);
        service.saveDraft("game-1", mapper.valueToTree(dsl), teacher);
        verify(reviews, never()).saveEditedGame(any(), any());
        verify(games).saveAndFlush(game);
    }

    @Test
    void unavailableSceneNeverPublishesDraft() {
        when(images.load(any(), any())).thenThrow(new SceneImageUnavailableException("private", null));

        assertThatThrownBy(() -> service.publish("game-1", mapper.createObjectNode(), teacher))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getErrorCode()).isEqualTo(ErrorCode.SCENE_IMAGE_UNAVAILABLE);
                    assertThat(error).hasMessageContaining("Scene image");
                });
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void invalidImageIsAClientValidationErrorAndNeverPublishesDraft() {
        when(images.load(any(), any())).thenThrow(new InvalidSceneImageException("private host"));

        assertThatThrownBy(() -> service.publish("game-1", mapper.createObjectNode(), teacher))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void optionImageMustBeBrowserAccessibleBeforePublishing() {
        when(images.load(eq(java.net.URI.create("https://scene.example/cat.png")), any()))
                .thenThrow(new InvalidSceneImageException("CORS blocked"));

        assertThatThrownBy(() -> service.publish("game-1", mapper.createObjectNode(), teacher))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void republishingIsIdempotentAndDoesNotValidateAChangedBody() {
        game.setStatus(GameStatus.PUBLISHED);
        game.setShareCode("ABC234");

        var result = service.publish("game-1", null, teacher);

        assertThat(result.get("shareCode")).isEqualTo("ABC234");
        verify(validation, never()).validate(any(tools.jackson.databind.JsonNode.class));
    }

    @Test
    void audioVisualCannotPublishWithoutEveryOptionImage() {
        game.setGameType(GameType.AUDIO_VISUAL_MATCH);
        var question = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl("q1", 30, 100,
                "cat", null, null, null,
                new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("cat", "https://scene.example/cat.png"),
                List.of(new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("dog", null)));
        var avm = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl("1.0.0", GameType.AUDIO_VISUAL_MATCH,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_3, "Animals"),
                new GameplaySettings(1.5), List.of(question));
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), avm));
        when(strategies.get(GameType.AUDIO_VISUAL_MATCH)).thenReturn(strategy);
        when(strategy.parseToQuestions(avm)).thenReturn(List.of());
        assertThatThrownBy(() -> service.publish("game-1", mapper.valueToTree(avm), teacher))
                .isInstanceOf(ApiException.class).hasMessageContaining("imageUrl");
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void audioVisualCannotPublishTheSameImageAsCorrectAndWrong() {
        game.setGameType(GameType.AUDIO_VISUAL_MATCH);
        var question = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl("q1", 30, 100,
                "cat", null, null, null,
                new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("cat", "https://scene.example/cat.png"),
                List.of(new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("dog", "https://scene.example/cat.png")));
        var avm = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl("1.0.0", GameType.AUDIO_VISUAL_MATCH,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_3, "Animals"),
                new GameplaySettings(1.5), List.of(question));
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), avm));
        when(strategies.get(GameType.AUDIO_VISUAL_MATCH)).thenReturn(strategy);
        when(strategy.parseToQuestions(avm)).thenReturn(List.of());
        assertThatThrownBy(() -> service.publish("game-1", mapper.valueToTree(avm), teacher))
                .isInstanceOf(ApiException.class).hasMessageContaining("distinct");
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void audioVisualCanPublishValidatedBundledNotoImagesWithoutExternalFetch() {
        game.setGameType(GameType.AUDIO_VISUAL_MATCH);
        var question = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl("q1", 30, 100,
                "cat", null, null, null,
                new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("Mèo", "/assets/noto/emoji_u1f431.svg"),
                List.of(new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("Chó", "/assets/noto/emoji_u1f436.svg")));
        var avm = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl("1.0.0", GameType.AUDIO_VISUAL_MATCH,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_3, "Animals"),
                new GameplaySettings(1.5), List.of(question));
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), avm));
        when(strategies.get(GameType.AUDIO_VISUAL_MATCH)).thenReturn(strategy);
        when(strategy.parseToQuestions(avm)).thenReturn(List.of());
        var result = service.publish("game-1", mapper.valueToTree(avm), teacher);
        assertThat(result.get("status")).isEqualTo("PUBLISHED");
        verify(images, never()).load(any(), any());
    }

    @Test
    void audioVisualCannotPublishWhenEditedAudioTextIsRejectedByReviewer() {
        game.setGameType(GameType.AUDIO_VISUAL_MATCH);
        var question = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl("q1", 30, 100,
                "dog", null, null, null,
                new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("Mèo", "/assets/noto/emoji_u1f431.svg"),
                List.of(new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("Chó", "/assets/noto/emoji_u1f436.svg")));
        var avm = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl("1.0.0", GameType.AUDIO_VISUAL_MATCH,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_3, "Animals"),
                new GameplaySettings(1.5), List.of(question));
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), avm));
        when(strategies.get(GameType.AUDIO_VISUAL_MATCH)).thenReturn(strategy);
        when(reviewer.review(eq(avm), any(), any())).thenReturn(new com.aigameplatform.backend.service.generation.GeneratedContentReviewer.Result(
                List.of(new com.aigameplatform.backend.service.validation.ValidationError("$.questions[0]", "Audio does not match")),
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable()));
        assertThatThrownBy(() -> service.publish("game-1", mapper.valueToTree(avm), teacher))
                .isInstanceOf(com.aigameplatform.backend.exception.GeneratedContentUnverifiedException.class);
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void audioVisualCannotPublishTwoNotoPicturesOfTheSameConcept() {
        game.setGameType(GameType.AUDIO_VISUAL_MATCH);
        var question = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl("q1", 30, 100,
                "cat", null, null, null,
                new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("Mèo", "/assets/noto/emoji_u1f431.svg"),
                List.of(new com.aigameplatform.backend.dto.dsl.ImageChoiceDsl("Mèo đứng", "/assets/noto/emoji_u1f408.svg")));
        var avm = new com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl("1.0.0", GameType.AUDIO_VISUAL_MATCH,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_3, "Animals"),
                new GameplaySettings(1.5), List.of(question));
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), avm));
        when(strategies.get(GameType.AUDIO_VISUAL_MATCH)).thenReturn(strategy);
        when(strategy.parseToQuestions(avm)).thenReturn(List.of());
        assertThatThrownBy(() -> service.publish("game-1", mapper.valueToTree(avm), teacher))
                .isInstanceOf(ApiException.class).hasMessageContaining("same concept");
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void oddImageCannotPublishWhenReviewerRejectsEditedCriterion() {
        game.setGameType(GameType.ODD_ONE_OUT);
        var odd = oddImageDsl("Hình nào màu đỏ?");
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), odd));
        when(strategies.get(GameType.ODD_ONE_OUT)).thenReturn(strategy);
        when(strategy.parseToQuestions(odd)).thenReturn(List.of());
        when(reviewerProvider.getIfAvailable()).thenReturn(reviewer);
        when(reviewer.review(eq(odd), any(), any())).thenReturn(new com.aigameplatform.backend.service.generation.GeneratedContentReviewer.Result(
                List.of(new com.aigameplatform.backend.service.validation.ValidationError("$.questions[0]", "Mơ hồ")),
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable()));
        assertThatThrownBy(() -> service.publish("game-1", mapper.valueToTree(odd), teacher))
                .isInstanceOf(com.aigameplatform.backend.exception.GeneratedContentUnverifiedException.class);
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void oddImageRagPublishFailsClosedWithoutCurriculumEvidence() {
        game.setGameType(GameType.ODD_ONE_OUT);
        var odd = oddImageDsl("Hình nào không phải trái cây?");
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), odd));
        when(strategies.get(GameType.ODD_ONE_OUT)).thenReturn(strategy);
        var ragService = new GamePublicationService(games, validation, strategies, images, reviews, reviewerProvider,
                mapper, true, "http://localhost:5173", "https://play.example/room/");
        assertThatThrownBy(() -> ragService.publish("game-1", mapper.valueToTree(odd), teacher))
                .isInstanceOf(com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException.class);
        verify(reviewerProvider, never()).getIfAvailable();
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void oddImagePublishesAfterSuccessfulSemanticReview() {
        game.setGameType(GameType.ODD_ONE_OUT);
        var odd = oddImageDsl("Hình nào không phải trái cây?");
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), odd));
        when(strategies.get(GameType.ODD_ONE_OUT)).thenReturn(strategy);
        when(strategy.parseToQuestions(odd)).thenReturn(List.of());
        when(reviewerProvider.getIfAvailable()).thenReturn(reviewer);
        when(reviewer.review(eq(odd), any(), any())).thenReturn(new com.aigameplatform.backend.service.generation.GeneratedContentReviewer.Result(
                List.of(), com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable(), true));
        assertThat(service.publish("game-1", mapper.valueToTree(odd), teacher).get("status")).isEqualTo("PUBLISHED");
    }

    private static com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl oddImageDsl(String criterion) {
        var q = new com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl("q1", 30, 10, null, null, null, null,
                List.of(new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("a", "Táo", "apple", "/assets/noto/emoji_u1f34e.svg"),
                        new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("b", "Chuối", "banana", "/assets/noto/emoji_u1f34c.svg"),
                        new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("c", "Nho", "grapes", "/assets/noto/emoji_u1f347.svg"),
                        new com.aigameplatform.backend.dto.dsl.TextChoiceDsl("d", "Cà rốt", "carrot", "/assets/noto/emoji_u1f955.svg")), "d", criterion);
        return new com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT,
                com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE,
                new GameMetadata("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây"),
                new GameplaySettings(1), List.of(q));
    }

    private static VisualClozeGameDsl imageDsl() {
        var question = new VisualClozeQuestionDsl("q1", 45, 100, null, null, null, null, null, null, null,
                "Find the cat", "https://scene.example/scene.png", 800, 600,
                List.of(new VisualClozeBlankDsl("b1", 200, 200, "o1")),
                List.of(new VisualClozeImageOptionDsl("o1", "cat", "https://scene.example/cat.png"),
                        new VisualClozeImageOptionDsl("o2", "dog", "https://scene.example/dog.png")));
        return new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Animals", Subject.MATH, GradeLevel.GRADE_1, "Animals"),
                new GameplaySettings(1.5), List.of(question));
    }
}
