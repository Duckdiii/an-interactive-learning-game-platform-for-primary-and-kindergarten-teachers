package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** POST /games/{gameId}/questions/{questionId}/regenerate ở tầng GameService: quyền, phiên đang chạy, không lưu. */
class GameServiceRegenerateTest {

    private static final String OWNER = "teacher-1";

    private final GameRepository games = mock(GameRepository.class);
    private final GameSessionRepository sessions = mock(GameSessionRepository.class);
    private final GameContentHandler dsl = mock(GameContentHandler.class);
    private GameService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        when(dsl.handles(any())).thenReturn(true);
        when(dsl.toResponse(any(), any())).thenAnswer(inv -> ((ObjectNode) inv.getArgument(1)).put("kind", "DSL"));
        service = new GameService(games, mock(TeacherRepository.class), List.of(dsl), JsonMapper.builder().build(),
                mock(AiRequestRateLimiter.class), TransactionOperations.withoutTransaction(),
                mock(GameCurriculumReviewService.class), mock(ObjectProvider.class), new java.util.Random(7), null, sessions, null, null);
    }

    private static Game game(String authorId) {
        Teacher author = new Teacher();
        author.setId(authorId);
        Game game = new Game();
        game.setId("g1");
        game.setAuthor(author);
        game.setGameType(GameType.QUIZ);
        game.setTitle("T");
        game.setStatus(GameStatus.DRAFT);
        game.setUpdatedAt(Instant.EPOCH);
        return game;
    }

    @Test
    void delegatesToTheHandlerWithTheStoredGameAndNeverSaves() {
        when(games.findById("g1")).thenReturn(Optional.of(game(OWNER)));
        var question = new QuizQuestionDsl("q2", 30, 10, null, null, null, null, "3 + 3 = ?",
                List.of(new TextChoiceDsl("opt_0", "6"), new TextChoiceDsl("opt_1", "7")), "opt_0");
        var expected = new RegeneratedQuestionDto(question, GameType.QUIZ);
        when(dsl.regenerateQuestion(any(ObjectNode.class), eq("q2"), eq("làm dễ hơn"))).thenReturn(expected);

        RegeneratedQuestionDto result = service.regenerateQuestion(OWNER, "g1", "q2", "làm dễ hơn");

        assertThat(result).isSameAs(expected);
        verify(games, never()).save(any());
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void wholeGameReturnsPreviewWithOriginalManagementFieldsWithoutWriting() {
        when(games.findById("g1")).thenReturn(Optional.of(game(OWNER)));
        var preview = JsonMapper.builder().build().createObjectNode().put("status", "PUBLISHED").put("newGame", true);
        when(dsl.regenerate(any(), any())).thenReturn(preview);

        ObjectNode result = service.regenerate(OWNER, "g1", null);

        assertThat(result.path("gameId").asString()).isEqualTo("g1");
        assertThat(result.path("status").asString()).isEqualTo("DRAFT");
        assertThat(result.path("newGame").asBoolean()).isTrue();
        verify(games, never()).save(any());
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void wholeGameRejectsUnfinishedSessionBeforeCallingAi() {
        when(games.findById("g1")).thenReturn(Optional.of(game(OWNER)));
        when(sessions.hasUnfinishedSession(eq("g1"), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.regenerate(OWNER, "g1", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
        verify(dsl, never()).regenerate(any(), any());
    }

    @Test
    void unknownGameIsNotFound() {
        when(games.findById("g1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.regenerateQuestion(OWNER, "g1", "q1", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void anotherTeachersGameIsForbidden() {
        when(games.findById("g1")).thenReturn(Optional.of(game("teacher-2")));

        assertThatThrownBy(() -> service.regenerateQuestion(OWNER, "g1", "q1", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
        verify(dsl, never()).regenerateQuestion(any(), any(), any());
    }

    @Test
    void gameWithAnActiveSessionIsConflictAndAiIsNotCalled() {
        when(games.findById("g1")).thenReturn(Optional.of(game(OWNER)));
        when(sessions.hasUnfinishedSession(eq("g1"), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.regenerateQuestion(OWNER, "g1", "q1", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
        verify(dsl, never()).regenerateQuestion(any(), any(), any());
    }

    @Test
    void handlersWithoutQuestionCardsRejectWith400() {
        GameContentHandler cpfLike = mock(GameContentHandler.class, CALLS_REAL_METHODS);

        assertThatThrownBy(() -> cpfLike.regenerateQuestion(null, "q1", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }
}
