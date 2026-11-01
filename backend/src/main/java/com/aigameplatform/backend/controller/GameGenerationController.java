package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.generation.GameGenerationApplicationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Persists a teacher-owned draft and its curriculum review separately from the DSL v1.0.0 document. */
@RestController
@RequestMapping("/api/games")
public class GameGenerationController {
    private final GameGenerationApplicationService games;
    public GameGenerationController(GameGenerationApplicationService games) { this.games = games; }

    @PostMapping("/generate")
    public ApiResponse<GameGenerationApplicationService.GeneratedGame> generate(@RequestBody GenerateGameRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(games.generateAndSave(request.gameType(), request.toDslRequest(),
                teacher == null ? null : teacher.teacherId()));
    }
}
