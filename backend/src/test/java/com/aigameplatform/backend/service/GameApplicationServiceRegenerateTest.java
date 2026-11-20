package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.request.RegenerateQuestionRequest;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.media.GameAudioEnricher;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.QuizGameStrategy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.json.JsonMapper;

class GameApplicationServiceRegenerateTest {

    private final GameGenerationService generation = mock(GameGenerationService.class);
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final GameCurriculumReviewService curriculumReviews = mock(GameCurriculumReviewService.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<CurriculumCatalog> curriculumCatalog = mock(ObjectProvider.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    @SuppressWarnings("unchecked")
    private final ObjectProvider<GameAudioEnricher> audioEnrichers = mock(ObjectProvider.class);
    private final GameAudioEnricher audioEnricher = mock(GameAudioEnricher.class);
    private final GameRepository games = mock(GameRepository.class);
    private final GameSessionRepository sessions = mock(GameSessionRepository.class);

    private GameApplicationService service;
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");
    private final QuizGameStrategy quizStrategy = new QuizGameStrategy(mapper);

    private Game game;
    private QuizQuestion q1Entity;
    private QuizQuestion q2Entity;

    @BeforeEach
    void setUp() {
        when(audioEnrichers.getIfAvailable()).thenReturn(audioEnricher);
        org.mockito.Mockito.doReturn(quizStrategy).when(strategies).get(GameType.QUIZ);

        Teacher author = new Teacher();
        author.setId("teacher-1");

        game = new Game();
        game.setId("game-1");
        game.setTitle("Phép cộng lớp 1");
        game.setTopic("Phép cộng trong phạm vi 10");
        game.setSubject(Subject.MATH);
        game.setGrade(GradeLevel.GRADE_1);
        game.setGameType(GameType.QUIZ);
        game.setStatus(GameStatus.DRAFT);
        game.setAuthor(author);

        q1Entity = new QuizQuestion();
        q1Entity.setId("uuid-1");
        q1Entity.setItemIndex(0);
        q1Entity.setText("1 + 1 = ?");
        q1Entity.setOptions(List.of("2", "3"));
        q1Entity.setCorrectIndex(0);
        q1Entity.setTimeLimit(30);
        q1Entity.setPoint(10);

        q2Entity = new QuizQuestion();
        q2Entity.setId("uuid-2");
        q2Entity.setItemIndex(1);
        q2Entity.setText("2 + 2 = ?");
        q2Entity.setOptions(List.of("4", "5"));
        q2Entity.setCorrectIndex(0);
        q2Entity.setTimeLimit(30);
        q2Entity.setPoint(10);

        game.setQuestions(new ArrayList<>(List.of(q1Entity, q2Entity)));

        service = new GameApplicationService(generation, teachers, curriculumReviews, strategies,
                curriculumCatalog, mapper, audioEnrichers, games, sessions);
    }

    @Test
    void happyPathRegeneratesAndEnrichesWithoutSavingToDb() {
        when(games.findById("game-1")).thenReturn(Optional.of(game));
        when(sessions.existsByGame_IdAndStatus("game-1", SessionStatus.ACTIVE)).thenReturn(false);

        var candidate = new QuizQuestionDsl("q1", 30, 10, "Tính nhẩm: 3 + 3 = ?", null, null, null,
                "3 + 3 = ?", List.of(new TextChoiceDsl("opt_0", "6"), new TextChoiceDsl("opt_1", "7")), "opt_0");

        when(generation.regenerateQuestion(eq(GameType.QUIZ), any(), any(), eq("làm dễ hơn"), eq("q2"), any()))
                .thenReturn(candidate);

        doAnswer(invocation -> {
            QuestionGame q = invocation.getArgument(0);
            q.setAudioUrl("https://storage.example/audio.mp3");
            return null;
        }).when(audioEnricher).enrichWithAudio(any());

        var request = new RegenerateQuestionRequest("làm dễ hơn");
        RegeneratedQuestionDto result = service.regenerateQuestion("game-1", "q2", request, teacher);

        assertThat(result.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(result.question().id()).isEqualTo("q2");
        assertThat(((QuizQuestionDsl) result.question()).questionText()).isEqualTo("3 + 3 = ?");
        assertThat(result.question().audioUrl()).isEqualTo("https://storage.example/audio.mp3");

        // Verify that game was NEVER saved to DB
        verify(games, never()).save(any());
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void unauthorizedWhenPrincipalNull() {
        var request = new RegenerateQuestionRequest(null);
        assertThatThrownBy(() -> service.regenerateQuestion("game-1", "q1", request, null))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void notFoundWhenGameDoesNotExist() {
        when(games.findById("missing")).thenReturn(Optional.empty());

        var request = new RegenerateQuestionRequest(null);
        assertThatThrownBy(() -> service.regenerateQuestion("missing", "q1", request, teacher))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void forbiddenWhenTeacherIsNotAuthor() {
        Teacher other = new Teacher();
        other.setId("teacher-2");
        game.setAuthor(other);

        when(games.findById("game-1")).thenReturn(Optional.of(game));

        var request = new RegenerateQuestionRequest(null);
        assertThatThrownBy(() -> service.regenerateQuestion("game-1", "q1", request, teacher))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void conflictWhenGameHasActiveSession() {
        when(games.findById("game-1")).thenReturn(Optional.of(game));
        when(sessions.existsByGame_IdAndStatus("game-1", SessionStatus.ACTIVE)).thenReturn(true);

        var request = new RegenerateQuestionRequest(null);
        assertThatThrownBy(() -> service.regenerateQuestion("game-1", "q1", request, teacher))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void notFoundWhenQuestionIdNotInGame() {
        when(games.findById("game-1")).thenReturn(Optional.of(game));
        when(sessions.existsByGame_IdAndStatus("game-1", SessionStatus.ACTIVE)).thenReturn(false);

        var request = new RegenerateQuestionRequest(null);
        assertThatThrownBy(() -> service.regenerateQuestion("game-1", "q99", request, teacher))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
    }
}
