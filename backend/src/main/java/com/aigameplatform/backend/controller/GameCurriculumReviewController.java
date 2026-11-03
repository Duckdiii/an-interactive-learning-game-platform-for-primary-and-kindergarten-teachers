package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Teacher-only endpoint; student game DSL serialization never includes this resource. */
@RestController
@RequestMapping("/api/games")
public class GameCurriculumReviewController {
    private final GameCurriculumReviewService reviews;
    public GameCurriculumReviewController(GameCurriculumReviewService reviews) { this.reviews = reviews; }
    @GetMapping("/{id}/curriculum-review")
    public ApiResponse<GameCurriculumReviewService.ReviewView> get(@PathVariable String id,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(reviews.getForTeacher(id, teacher == null ? null : teacher.teacherId()));
    }
}
