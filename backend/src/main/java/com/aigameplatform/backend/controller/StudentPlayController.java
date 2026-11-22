package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.dto.request.PlayRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.service.play.LiveArenaService;
import com.aigameplatform.backend.service.play.StudentPlayService;
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
@RequestMapping
public class StudentPlayController {
    private final StudentPlayService play;
    private final LiveArenaService liveArenaService;

    public StudentPlayController(StudentPlayService play, LiveArenaService liveArenaService) {
        this.play = play;
        this.liveArenaService = liveArenaService;
    }

    @GetMapping("/api/games/shared/{shareCode}")
    public ApiResponse<Map<String, Object>> shared(@PathVariable String shareCode) {
        return ApiResponse.ok(play.sharedGame(shareCode));
    }

    @PostMapping("/api/games/shared/{shareCode}/play")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> start(@PathVariable String shareCode, @Valid @RequestBody PlayRequest body) {
        Map<String, Object> started = play.start(shareCode, body.nickname());
        liveArenaService.addParticipant(String.valueOf(started.get("sessionId")),
                new ParticipantDto(String.valueOf(started.get("participantId")),
                        String.valueOf(started.get("nickname")), true));
        return ApiResponse.ok(started);
    }

    @GetMapping("/api/sessions/{sessionId}/questions")
    public ApiResponse<ObjectNode> questions(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantId) {
        ObjectNode questions = play.questions(sessionId, participantId);
        liveArenaService.startQuestionClock(sessionId, participantId); // chỉ chạy tới đây khi participantId đã được service xác thực
        return ApiResponse.ok(questions);
    }

    @PostMapping("/api/sessions/{sessionId}/interactions")
    public ApiResponse<Map<String, Object>> interaction(@PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantIdHeader,
            @RequestBody(required = false) JsonNode body) {
        // Học sinh không có Principal ở REST; participantId do play.interact xác thực thuộc đúng phiên.
        Map<String, Object> result = play.interact(sessionId, participantIdHeader, body);
        liveArenaService.broadcastAnswerStatus(sessionId, participantIdHeader);

        // body đã được play.interact kiểm tra là object; điểm tính theo giờ server trong LiveArenaService.
        liveArenaService.recordAnswer(sessionId, participantIdHeader, body.path("questionId").asText(),
                Boolean.TRUE.equals(result.get("isCorrect")));
        return ApiResponse.ok(result);
    }
}
