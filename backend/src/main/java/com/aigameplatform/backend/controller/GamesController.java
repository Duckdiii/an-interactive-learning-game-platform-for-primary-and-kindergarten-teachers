package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.request.RegenerateQuestionRequest;
import com.aigameplatform.backend.dto.request.ReviseGameRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.dto.response.GameSummaryResponse;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.GamePublicationService;
import com.aigameplatform.backend.service.game.GameService;
import com.aigameplatform.backend.service.game.ReviewSeedService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

/**
 * Nhóm Games theo docs/openapi/openapi.yaml (generate, list, get, update, publish, revise, delete); chỉ điều phối, nghiệp vụ
 * ở {@link GameService} và {@link GamePublicationService}.
 */
@RestController
@RequestMapping("/api/games")
public class GamesController {

    private final GameService games;
    private final GamePublicationService publication;
    private final ReviewSeedService reviewSeed;

    public GamesController(GameService games, GamePublicationService publication, ReviewSeedService reviewSeed) {
        this.games = games;
        this.publication = publication;
        this.reviewSeed = reviewSeed;
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<JsonNode>> generate(@Valid @RequestBody GenerateGameRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        String teacherId = teacherId(teacher);
        // Game ôn tập: thêm số liệu lớp làm sai của game cũ vào phần mô tả (UC-18 bước 5a).
        GenerateGameRequest effective = request.reviewFrom() == null ? request : reviewSeed.withReviewContext(request, teacherId);
        return ResponseEntity.ok(ApiResponse.ok(games.generate(teacherId, effective)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<GameSummaryResponse>>> list(
            @RequestParam(required = false) Subject subject,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) GameStatus status,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ResponseEntity.ok(ApiResponse.ok(games.list(teacherId(teacher), subject, gradeLevel, status)));
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<ApiResponse<JsonNode>> get(@PathVariable String gameId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ResponseEntity.ok(ApiResponse.ok(games.get(teacherId(teacher), gameId)));
    }

    @PutMapping("/{gameId}")
    public ResponseEntity<ApiResponse<JsonNode>> update(@PathVariable String gameId, @RequestBody JsonNode body,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ResponseEntity.ok(ApiResponse.ok(games.update(teacherId(teacher), gameId, body)));
    }

    @PostMapping("/{gameId}/publish")
    public ResponseEntity<ApiResponse<Map<String, Object>>> publish(@PathVariable String gameId,
            @RequestBody(required = false) JsonNode body, @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ResponseEntity.ok(ApiResponse.ok(publication.publish(gameId, body, teacher)));
    }

    @PostMapping("/{gameId}/revise")
    public ResponseEntity<ApiResponse<JsonNode>> revise(@PathVariable String gameId, @Valid @RequestBody ReviseGameRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ResponseEntity.ok(ApiResponse.ok(games.revise(teacherId(teacher), gameId, request)));
    }

    @PostMapping("/{gameId}/questions/{questionId}/regenerate")
    public ResponseEntity<ApiResponse<RegeneratedQuestionDto>> regenerateQuestion(@PathVariable String gameId,
            @PathVariable String questionId, @Valid @RequestBody(required = false) RegenerateQuestionRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        String feedback = request == null ? null : request.feedback();
        return ResponseEntity.ok(ApiResponse.ok(games.regenerateQuestion(teacherId(teacher), gameId, questionId, feedback)));
    }

    @DeleteMapping("/{gameId}")
    public ResponseEntity<Void> delete(@PathVariable String gameId, @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        games.delete(teacherId(teacher), gameId);
        return ResponseEntity.noContent().build();
    }

    private static String teacherId(AuthenticatedTeacher teacher) {
        return teacher == null ? null : teacher.teacherId();
    }
}
