package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.PlayRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.service.play.LiveArenaService;
import com.aigameplatform.backend.service.play.PlayStartRateLimiter;
import com.aigameplatform.backend.service.play.StudentPlayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
@RequestMapping("/api")
public class StudentPlayController {
    private final StudentPlayService play;
    private final LiveArenaService liveArenaService;
    private final PlayStartRateLimiter playStartLimiter;

    public StudentPlayController(StudentPlayService play, LiveArenaService liveArenaService,
            PlayStartRateLimiter playStartLimiter) {
        this.playStartLimiter = playStartLimiter;
        this.play = play;
        this.liveArenaService = liveArenaService;
    }

    @GetMapping("/games/shared/{shareCode}")
    public ApiResponse<Map<String, Object>> shared(@PathVariable String shareCode) {
        return ApiResponse.ok(play.sharedGame(shareCode));
    }

    @PostMapping("/games/shared/{shareCode}/play")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> start(@PathVariable String shareCode, @Valid @RequestBody PlayRequest body,
            HttpServletRequest request) {
        playStartLimiter.acquire(request.getRemoteAddr());
        return ApiResponse.ok(play.start(shareCode, body.nickname()));
    }

    @GetMapping("/sessions/{sessionId}/questions")
    public ApiResponse<ObjectNode> questions(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantId) {
        return ApiResponse.ok(play.questions(sessionId, participantId));
    }

    @PostMapping("/sessions/{sessionId}/interactions")
    public ApiResponse<Map<String, Object>> interaction(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantIdHeader,
            @RequestBody(required = false) JsonNode body) {
        // interact() đã xác thực X-Participant-Id thuộc phiên; chỉ tin header này, không tin id trong body.
        Map<String, Object> result = play.interact(sessionId, participantIdHeader, body);
        liveArenaService.broadcastAnswerStatus(sessionId, participantIdHeader);
        // Bảng xếp hạng lấy tổng điểm server đã tính, không tự chấm lại từ dữ liệu client.
        if (result.get("totalScore") instanceof Number total) {
            liveArenaService.syncScore(sessionId, participantIdHeader, total.intValue());
        }
        return ApiResponse.ok(result);
    }
}
