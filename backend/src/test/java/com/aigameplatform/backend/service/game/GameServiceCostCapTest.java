package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.admin.CostMonitoringService;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.databind.json.JsonMapper;

/** Circuit breaker FR-12: chạm trần chi phí AI thì không gọi AI, trả 503. */
class GameServiceCostCapTest {

    @Test
    @SuppressWarnings("unchecked")
    void generateIsRefusedWith503WhenTheMonthlyCostCapIsReached() {
        GameContentHandler handler = mock(GameContentHandler.class);
        when(handler.handles(any())).thenReturn(true);
        TeacherRepository teachers = mock(TeacherRepository.class);
        when(teachers.existsById("teacher-1")).thenReturn(true);
        CostMonitoringService cost = mock(CostMonitoringService.class);
        when(cost.isCostCapExceeded()).thenReturn(true);
        ObjectProvider<CostMonitoringService> costProvider = mock(ObjectProvider.class);
        when(costProvider.getIfAvailable()).thenReturn(cost);
        GameService service = new GameService(mock(GameRepository.class), teachers, List.of(handler),
                JsonMapper.builder().build(), mock(AiRequestRateLimiter.class), TransactionOperations.withoutTransaction(),
                mock(GameCurriculumReviewService.class), mock(ObjectProvider.class), new java.util.Random(7), null, null,
                costProvider, null);
        var request = new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, "Phép cộng trong phạm vi 10", false,
                GameType.QUIZ, null);

        assertThatThrownBy(() -> service.generate("teacher-1", request))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    org.assertj.core.api.Assertions.assertThat(e.getErrorCode()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE);
                    org.assertj.core.api.Assertions.assertThat(e.getMessage()).contains("chạm trần chi phí");
                });
        verify(handler, never()).generate(any(), any(), any());
    }
}
