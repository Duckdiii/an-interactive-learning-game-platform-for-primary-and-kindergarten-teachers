package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.exception.GeneratedContentUnverifiedException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.generation.GeneratedContentReviewer;
import com.aigameplatform.backend.service.media.LoadedSceneImage;
import com.aigameplatform.backend.service.media.SceneImageLoader;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.ValidationReport;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.json.JsonMapper;

/** A published image game must be checked against the actual current media, including after edits. */
class VisualClozeImagePublishReviewTest {
    private static final String ORIGIN = "http://localhost:5173";
    private final GameRepository games = mock(GameRepository.class);
    private final GameValidationService validation = mock(GameValidationService.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final GameContentStrategy strategy = mock(GameContentStrategy.class);
    private final SceneImageLoader images = mock(SceneImageLoader.class);
    private final GameCurriculumReviewService reviews = mock(GameCurriculumReviewService.class);
    private final GeneratedContentReviewer reviewer = mock(GeneratedContentReviewer.class);
    private final ObjectProvider<GeneratedContentReviewer> reviewerProvider = mock(ObjectProvider.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "t@example.com", "s1");
    private final Game game = new Game();
    private final LoadedSceneImage scene = image(11, 800, 600);
    private final LoadedSceneImage cat = image(21, 100, 100);
    private final LoadedSceneImage dog = image(22, 100, 100);
    private final VisualClozeGameDsl dsl = game(List.of(question("q1", "https://images.example/scene.png")));

    private GamePublicationService service(boolean rag) {
        return new GamePublicationService(games, validation, strategies, images, reviews, reviewerProvider, mapper,
                rag, ORIGIN, "https://play.example/room");
    }

    @BeforeEach
    void setup() {
        var owner = new Teacher();
        owner.setId("teacher-1");
        game.setId("game-1");
        game.setAuthor(owner);
        game.setGameType(GameType.VISUAL_CLOZE);
        game.setStatus(GameStatus.DRAFT);
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(games.findByShareCode(any())).thenReturn(Optional.empty());
        when(games.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(reviews.saveEditedGame(any(), eq("teacher-1"))).thenAnswer(call -> call.getArgument(0));
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        when(strategy.toGameDsl(game)).thenReturn(dsl);
        when(strategy.parseToQuestions(any(GameDsl.class))).thenReturn(List.of());
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), dsl));
        when(reviewerProvider.getIfAvailable()).thenReturn(reviewer);
        when(images.load(URI.create("https://images.example/scene.png"), ORIGIN)).thenReturn(scene);
        when(images.load(URI.create("https://images.example/cat.png"), ORIGIN)).thenReturn(cat);
        when(images.load(URI.create("https://images.example/dog.png"), ORIGIN)).thenReturn(dog);
    }

    @Test
    void publishReviewsCurrentSceneAndEveryOptionBeforePublishing() {
        when(reviewer.review(any(), anyString(), any(), any(), anyMap())).thenReturn(approved());

        service(false).publish("game-1", mapper.valueToTree(dsl), teacher);

        verify(reviewer).review(eq(dsl), eq("Animals"), any(), eq(scene),
                eq(Map.of("q1/o1", cat, "q1/o2", dog)));
        assertThat(game.getStatus()).isEqualTo(GameStatus.PUBLISHED);
    }

    @Test
    void publishRejectsWhenTheActualImagesOrMappingAreNotApproved() {
        when(reviewer.review(any(), anyString(), any(), any(), anyMap())).thenReturn(
                new GeneratedContentReviewer.Result(List.of(new ValidationError("$.questions[0]", "Không khớp ảnh")),
                        CurriculumEvidenceReview.unavailable()));

        assertThatThrownBy(() -> service(false).publish("game-1", mapper.valueToTree(dsl), teacher))
                .isInstanceOf(GeneratedContentUnverifiedException.class);
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(games, never()).saveAndFlush(any());
        verify(reviews, never()).saveEditedGame(any(), any());
    }

    @Test
    void publishFailsClosedWhenMultimodalReviewerIsUnavailable() {
        when(reviewerProvider.getIfAvailable()).thenReturn(null);
        assertThatThrownBy(() -> service(false).publish("game-1", mapper.valueToTree(dsl), teacher))
                .isInstanceOf(GeneratedContentUnverifiedException.class);
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void publishFailsClosedWhenMultimodalReviewerThrows() {
        when(reviewer.review(any(), anyString(), any(), any(), anyMap()))
                .thenThrow(new IllegalStateException("review service unavailable"));
        assertThatThrownBy(() -> service(false).publish("game-1", mapper.valueToTree(dsl), teacher))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
    }

    @Test
    void publishWithRagRequiresActualCurriculumEvidence() {
        assertThatThrownBy(() -> service(true).publish("game-1", mapper.valueToTree(dsl), teacher))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class);
        assertThat(game.getStatus()).isEqualTo(GameStatus.DRAFT);
        verify(reviewer, never()).review(any(), anyString(), any(), any(), anyMap());
    }

    @Test
    void questionsWithDifferentScenesAreReviewedWithTheirOwnSceneAndOptions() {
        var secondScene = image(12, 800, 600);
        var twoScenes = game(List.of(question("q1", "https://images.example/scene.png"),
                question("q2", "https://images.example/scene2.png")));
        when(strategy.toGameDsl(game)).thenReturn(twoScenes);
        when(validation.validate(any(tools.jackson.databind.JsonNode.class))).thenReturn(new ValidationReport(List.of(), twoScenes));
        when(images.load(URI.create("https://images.example/scene2.png"), ORIGIN)).thenReturn(secondScene);
        when(reviewer.review(any(), anyString(), any(), any(), anyMap())).thenReturn(approved());

        service(false).publish("game-1", mapper.valueToTree(twoScenes), teacher);

        var reviewed = ArgumentCaptor.forClass(GameDsl.class);
        var sceneCaptor = ArgumentCaptor.forClass(LoadedSceneImage.class);
        @SuppressWarnings("unchecked") var optionCaptor = (ArgumentCaptor<Map<String, LoadedSceneImage>>) (ArgumentCaptor<?>)
                ArgumentCaptor.forClass(Map.class);
        verify(reviewer, times(2)).review(reviewed.capture(), eq("Animals"), any(), sceneCaptor.capture(), optionCaptor.capture());
        for (int i = 0; i < 2; i++) {
            var reviewedGame = (VisualClozeGameDsl) reviewed.getAllValues().get(i);
            assertThat(reviewedGame.questions()).hasSize(1);
            String questionId = reviewedGame.questions().getFirst().id();
            if (questionId.equals("q1")) assertThat(sceneCaptor.getAllValues().get(i).bytes()).containsExactly(11);
            else {
                assertThat(questionId).isEqualTo("q2");
                assertThat(sceneCaptor.getAllValues().get(i).bytes()).containsExactly(12);
            }
            assertThat(optionCaptor.getAllValues().get(i)).containsOnlyKeys(questionId + "/o1", questionId + "/o2");
            assertThat(optionCaptor.getAllValues().get(i).get(questionId + "/o1").bytes()).containsExactly(21);
            assertThat(optionCaptor.getAllValues().get(i).get(questionId + "/o2").bytes()).containsExactly(22);
        }
    }

    private static LoadedSceneImage image(int marker, int width, int height) {
        return new LoadedSceneImage(new byte[] {(byte) marker}, "image/png", width, height);
    }

    private static GeneratedContentReviewer.Result approved() {
        return new GeneratedContentReviewer.Result(List.of(), CurriculumEvidenceReview.unavailable(), true);
    }

    private static VisualClozeGameDsl game(List<VisualClozeQuestionDsl> questions) {
        return new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Animals", Subject.MATH, GradeLevel.GRADE_1, "Animals"),
                new GameplaySettings(1.5), questions);
    }

    private static VisualClozeQuestionDsl question(String id, String sceneUrl) {
        return new VisualClozeQuestionDsl(id, 30, 100, null, null, null, null, null, null, null,
                "Find the cat", sceneUrl, 800, 600, List.of(new VisualClozeBlankDsl("b1", 200, 200, "o1")),
                List.of(new VisualClozeImageOptionDsl("o1", "cat", "https://images.example/cat.png"),
                        new VisualClozeImageOptionDsl("o2", "dog", "https://images.example/dog.png")));
    }
}
