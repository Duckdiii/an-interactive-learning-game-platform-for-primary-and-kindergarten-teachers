package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.GameApplicationService;
import com.aigameplatform.backend.service.GamePublicationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api/games")
public class GameController {
    private final GameApplicationService games;
    private final GamePublicationService publication;

    public GameController(GameApplicationService games, GamePublicationService publication) {
        this.games = games;
        this.publication = publication;
    }

    @PostMapping("/generate")
    public ApiResponse<ObjectNode> generate(@Valid @RequestBody GenerateGameRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(games.generate(request, teacher));
    }

    @GetMapping("/{gameId}")
    public ApiResponse<ObjectNode> getGame(@PathVariable String gameId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(publication.getGame(gameId, teacher));
    }

    @PutMapping("/{gameId}")
    public ApiResponse<ObjectNode> saveDraft(@PathVariable String gameId, @RequestBody JsonNode body,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(publication.saveDraft(gameId, body, teacher));
    }

    @PostMapping("/{gameId}/publish")
    public ApiResponse<java.util.Map<String, Object>> publish(@PathVariable String gameId,
            @RequestBody(required = false) JsonNode body,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(publication.publish(gameId, body, teacher));
    }
}
