package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.session.GameInsightsDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.AnswerShareDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.CommonWrongDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.QuestionDetailDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.ReviewNeededDto;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.play.GameInsightsService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Ba endpoint thống kê UC-18: ràng buộc tham số, người dùng lấy từ token và mã lỗi. */
@ExtendWith(MockitoExtension.class)
class GameInsightsControllerTest {

    @Mock
    private GameInsightsService insights;

    private MockMvc mvc;
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new GameInsightsController(insights))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(teacher, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void gameInsightsBindsSessionTypeAndIsoDatesAndUsesTheTokenTeacher() throws Exception {
        when(insights.getInsights(eq("g1"), eq(SessionType.TEAM), eq(LocalDate.of(2026, 11, 1)),
                eq(LocalDate.of(2026, 11, 20)), eq("c1"), eq(teacher)))
                .thenReturn(new GameInsightsDto(3, 0.5, 1.2, 0.67, 120.5, true, List.of()));

        mvc.perform(get("/api/games/g1/insights?sessionType=TEAM&from=2026-11-01&to=2026-11-20&classroomId=c1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.playCount").value(3))
                .andExpect(jsonPath("$.data.lowSample").value(true))
                .andExpect(jsonPath("$.data.completionRate").value(0.67))
                .andExpect(jsonPath("$.data.avgScore").value(120.5));
    }

    @Test
    void omittedParametersArePassedAsNull() throws Exception {
        when(insights.getInsights(any(), any(), any(), any(), any(), any()))
                .thenReturn(new GameInsightsDto(0, 0, 0, 0, 0, false, List.of()));

        mvc.perform(get("/api/games/g1/insights")).andExpect(status().isOk());

        verify(insights).getInsights("g1", null, null, null, null, teacher);
    }

    @Test
    void badSessionTypeOrDateIs400() throws Exception {
        mvc.perform(get("/api/games/g1/insights?sessionType=NOPE")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/games/g1/insights?from=22/11/2026")).andExpect(status().isBadRequest());
    }

    @Test
    void ownershipFailureSurfacesAs404() throws Exception {
        when(insights.getInsights(any(), any(), any(), any(), any(), any()))
                .thenThrow(new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy trò chơi"));

        mvc.perform(get("/api/games/other/insights")).andExpect(status().isNotFound());
    }

    @Test
    void invalidDateRangeFromTheServiceIs400() throws Exception {
        when(insights.getInsights(any(), any(), any(), any(), any(), any()))
                .thenThrow(new ApiException(ErrorCode.VALIDATION_ERROR, "from không được sau to"));

        mvc.perform(get("/api/games/g1/insights?from=2026-11-20&to=2026-11-01")).andExpect(status().isBadRequest());
    }

    @Test
    void questionInsightsReturnsTheDistribution() throws Exception {
        when(insights.getQuestionInsights(eq("g1"), eq("q4"), any(), any(), any(), any(), eq(teacher)))
                .thenReturn(new QuestionDetailDto("q4", 4, "CHỊ", 26, 0.41, true,
                        List.of(new AnswerShareDto("chi", 9, false)), 4, 2));

        mvc.perform(get("/api/games/g1/questions/q4/insights"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.distribution[0].label").value("chi"))
                .andExpect(jsonPath("$.data.otherCount").value(4))
                .andExpect(jsonPath("$.data.noAnswerCount").value(2));
    }

    @Test
    void reviewNeededDefaultsToThreeAndReturnsNullCommonWrongWhenAbsent() throws Exception {
        when(insights.listReviewNeeded(eq(3), eq(teacher))).thenReturn(List.of(
                new ReviewNeededDto("g1", "Ghép chữ", "q4", "CHỊ", 0.41, new CommonWrongDto("CHI", 9)),
                new ReviewNeededDto("g2", "Toán", "q1", "1+1", 0.5, null)));

        mvc.perform(get("/api/insights/review-needed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].commonWrong.label").value("CHI"))
                .andExpect(jsonPath("$.data[1].commonWrong").doesNotExist());
    }

    @Test
    void reviewNeededPassesTheLimitAndRejectsAnInvalidOneWith400() throws Exception {
        when(insights.listReviewNeeded(eq(0), eq(teacher)))
                .thenThrow(new ApiException(ErrorCode.VALIDATION_ERROR, "limit phải từ 1 đến 20"));

        mvc.perform(get("/api/insights/review-needed?limit=0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/insights/review-needed?limit=abc")).andExpect(status().isBadRequest());
    }
}
