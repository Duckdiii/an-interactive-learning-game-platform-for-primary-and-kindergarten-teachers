package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.PlayRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.service.play.LeaderboardRegistry;
import com.aigameplatform.backend.service.play.LiveArenaService;
import com.aigameplatform.backend.service.play.ScoringService;
import com.aigameplatform.backend.service.play.StudentPlayService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping
public class StudentPlayController {
    private final StudentPlayService play;
    private final LiveArenaService liveArenaService;
    private final ScoringService scoringService;
    private final LeaderboardRegistry leaderboardRegistry;

    public StudentPlayController(
            StudentPlayService play,
            LiveArenaService liveArenaService,
            ScoringService scoringService,
            LeaderboardRegistry leaderboardRegistry) {
        this.play = play;
        this.liveArenaService = liveArenaService;
        this.scoringService = scoringService;
        this.leaderboardRegistry = leaderboardRegistry;
    }

    @GetMapping({"/api/games/shared/{shareCode}", "/games/shared/{shareCode}"})
    public ApiResponse<Map<String, Object>> shared(@PathVariable String shareCode) {
        return ApiResponse.ok(play.sharedGame(shareCode));
    }

    @PostMapping({"/api/games/shared/{shareCode}/play", "/games/shared/{shareCode}/play"})
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> start(@PathVariable String shareCode, @Valid @RequestBody PlayRequest body) {
        return ApiResponse.ok(play.start(shareCode, body.nickname()));
    }

    @GetMapping({"/api/sessions/{sessionId}/questions", "/sessions/{sessionId}/questions"})
    public ApiResponse<ObjectNode> questions(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantId) {
        return ApiResponse.ok(play.questions(sessionId, participantId));
    }

    @PostMapping({"/api/sessions/{sessionId}/interactions", "/sessions/{sessionId}/interactions"})
    public ApiResponse<Map<String, Object>> interaction(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantIdHeader,
            @RequestBody(required = false) JsonNode body,
            Principal principal) {
        Map<String, Object> result = play.interact(sessionId, participantIdHeader, body);
        String pid = participantIdHeader;
        if (pid == null && principal != null) {
            pid = principal.getName();
        }
        if (pid == null && body != null && body.has("participantId")) {
            pid = body.get("participantId").asText();
        }
        if (pid != null) {
            liveArenaService.broadcastAnswerStatus(sessionId, pid);

            boolean isCorrect = Boolean.TRUE.equals(result.get("isCorrect"));
            long timeSpentMs = body != null && body.has("timeSpentMs") ? body.get("timeSpentMs").asLong(0) : 0;
            long timeLimitMs = 30_000L;
            if (result.containsKey("timeLimitMs")) {
                timeLimitMs = ((Number) result.get("timeLimitMs")).longValue();
            }

            int points = scoringService.calculateScore(isCorrect, timeSpentMs, timeLimitMs);
            String participantName = liveArenaService.getParticipantName(sessionId, pid);
            leaderboardRegistry.addScore(sessionId, pid, participantName, points);
            liveArenaService.broadcastLeaderboard(sessionId);
        }
        return ApiResponse.ok(result);
    }
}
