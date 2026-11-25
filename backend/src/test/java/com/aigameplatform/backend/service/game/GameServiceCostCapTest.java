package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.request.ReviseGameRequest;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.classroom.ClassroomService;
import com.aigameplatform.backend.service.admin.CostMonitoringService;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.databind.json.JsonMapper;

/** Circuit breaker FR-12: chạm trần chi phí AI thì không gọi AI, trả 503. */
class GameServiceCostCapTest {

    @Test
    @SuppressWarnings("unchecked")
    void aiOperationsAreRefusedWith503WhenTheMonthlyCostCapIsReached() {
        GameContentHandler handler = mock(GameContentHandler.class);
        when(handler.handles(any())).thenReturn(true);
        TeacherRepository teachers = mock(TeacherRepository.class);
        when(teachers.existsById("teacher-1")).thenReturn(true);
        CostMonitoringService cost = mock(CostMonitoringService.class);
        when(cost.isCostCapExceeded()).thenReturn(true);
        ObjectProvider<CostMonitoringService> costProvider = mock(ObjectProvider.class);
        when(costProvider.getIfAvailable()).thenReturn(cost);
        GameRepository games = mock(GameRepository.class);
        Teacher author = new Teacher();
        author.setId("teacher-1");
        Game game = new Game();
        game.setId("game-1");
        game.setAuthor(author);
        game.setStatus(GameStatus.DRAFT);
        game.setGameType(GameType.QUIZ);
        when(games.findById("game-1")).thenReturn(Optional.of(game));

        GameService service = new GameService(games, teachers, List.of(handler),
                JsonMapper.builder().build(), mock(AiRequestRateLimiter.class), TransactionOperations.withoutTransaction(),
                mock(GameCurriculumReviewService.class), mock(ObjectProvider.class), new java.util.Random(7), null,
                mock(GameSessionRepository.class), costProvider, null, mock(ClassroomService.class),
                mock(com.aigameplatform.backend.service.lesson.GameInputGuard.class));
        var request = new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, "Phép cộng trong phạm vi 10", false,
                GameType.QUIZ, null);

        assertBlocked(() -> service.generate("teacher-1", request));
        assertBlocked(() -> service.revise("teacher-1", "game-1", new ReviseGameRequest("Dễ hơn", List.of())));
        assertBlocked(() -> service.regenerate("teacher-1", "game-1", null));
        assertBlocked(() -> service.regenerateQuestion("teacher-1", "game-1", "q1", null));
        verify(handler, never()).generate(any(), any(), any());
        verify(handler, never()).revise(any(), any(), any());
        verify(handler, never()).regenerate(any(), any());
        verify(handler, never()).regenerateQuestion(any(), any(), any());
    }

    private static void assertBlocked(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    org.assertj.core.api.Assertions.assertThat(e.getErrorCode()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE);
                    org.assertj.core.api.Assertions.assertThat(e.getMessage()).contains("chạm trần chi phí");
                });
    }
}
