package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.PlayRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.service.play.StudentPlayService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api")
public class StudentPlayController {
    private final StudentPlayService play;

    public StudentPlayController(StudentPlayService play) { this.play = play; }

    @GetMapping("/games/shared/{shareCode}")
    public ApiResponse<Map<String, Object>> shared(@PathVariable String shareCode) {
        return ApiResponse.ok(play.sharedGame(shareCode));
    }

    @PostMapping("/games/shared/{shareCode}/play")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> start(@PathVariable String shareCode, @Valid @RequestBody PlayRequest body) {
        return ApiResponse.ok(play.start(shareCode, body.nickname()));
    }

    @GetMapping("/sessions/{sessionId}/questions")
    public ApiResponse<ObjectNode> questions(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantId) {
        return ApiResponse.ok(play.questions(sessionId, participantId));
    }

    @PostMapping("/sessions/{sessionId}/interactions")
    public ApiResponse<Map<String, Object>> interaction(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantId,
            @RequestBody JsonNode body) {
        return ApiResponse.ok(play.interact(sessionId, participantId, body));
    }
}
