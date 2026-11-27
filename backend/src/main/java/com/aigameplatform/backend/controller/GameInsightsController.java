package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.session.GameInsightsDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.QuestionDetailDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.ReviewNeededDto;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.play.GameInsightsService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class GameInsightsController {

    private final GameInsightsService insights;

    public GameInsightsController(GameInsightsService insights) {
        this.insights = insights;
    }

    @GetMapping("/api/games/{gameId}/insights")
    public ApiResponse<GameInsightsDto> getGameInsights(
            @PathVariable String gameId,
            @RequestParam(required = false) SessionType sessionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String classroomId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(insights.getInsights(gameId, sessionType, from, to, classroomId, teacher));
    }

    @GetMapping("/api/games/{gameId}/questions/{questionId}/insights")
    public ApiResponse<QuestionDetailDto> getQuestionInsights(
            @PathVariable String gameId,
            @PathVariable String questionId,
            @RequestParam(required = false) SessionType sessionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String classroomId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(insights.getQuestionInsights(gameId, questionId, sessionType, from, to, classroomId, teacher));
    }

    @GetMapping("/api/insights/review-needed")
    public ApiResponse<List<ReviewNeededDto>> listReviewNeeded(
            @RequestParam(defaultValue = "3") int limit,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(insights.listReviewNeeded(limit, teacher));
    }
}
