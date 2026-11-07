package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.response.GameSummaryResponse;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.GameService;
import jakarta.validation.Valid;
import java.util.List;
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

/** Nhóm Games theo docs/openapi/openapi.yaml (generate, list, get, update, delete); chỉ điều phối, nghiệp vụ ở {@link GameService}. */
@RestController
@RequestMapping("/api/games")
public class GamesController {

    private final GameService games;

    public GamesController(GameService games) {
        this.games = games;
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<JsonNode>> generate(@Valid @RequestBody GenerateGameRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ResponseEntity.ok(ApiResponse.ok(games.generate(teacherId(teacher), request)));
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

    @DeleteMapping("/{gameId}")
    public ResponseEntity<Void> delete(@PathVariable String gameId, @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        games.delete(teacherId(teacher), gameId);
        return ResponseEntity.noContent().build();
    }

    private static String teacherId(AuthenticatedTeacher teacher) {
        return teacher == null ? null : teacher.teacherId();
    }
}
