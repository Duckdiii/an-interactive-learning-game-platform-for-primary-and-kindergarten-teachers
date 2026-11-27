package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.narration.GameNarrationService;
import com.aigameplatform.backend.service.narration.NarrationFeedbackService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
public class GameNarrationController {
    private final GameNarrationService narration;
    private final NarrationFeedbackService feedback;

    public GameNarrationController(GameNarrationService narration, NarrationFeedbackService feedback) {
        this.narration = narration;
        this.feedback = feedback;
    }

    @PostMapping("/{gameId}/narration/preview")
    public ApiResponse<GameNarrationService.NarrationPreview> preview(@PathVariable String gameId,
            @Valid @RequestBody PreviewRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(narration.generate(gameId, request.questionId(), teacher));
    }

    @PostMapping("/{gameId}/narration/feedback")
    public ApiResponse<NarrationFeedbackService.FeedbackAudioUrls> feedback(@PathVariable String gameId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(feedback.getFeedbackAudioUrls(gameId, teacher));
    }

    public record PreviewRequest(@NotBlank String questionId) { }
}
