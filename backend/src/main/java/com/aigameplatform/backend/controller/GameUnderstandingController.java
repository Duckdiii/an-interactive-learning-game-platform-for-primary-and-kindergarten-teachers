package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.request.UnderstandGameRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.response.GameUnderstandingResponse;
import com.aigameplatform.backend.service.understanding.GameUnderstandingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** {@code POST /games/understand} theo openapi.yaml; chỉ điều phối, nghiệp vụ ở {@link GameUnderstandingService}. */
@RestController
@RequestMapping("/api/games")
public class GameUnderstandingController {

    private final GameUnderstandingService understanding;

    public GameUnderstandingController(GameUnderstandingService understanding) {
        this.understanding = understanding;
    }

    @PostMapping("/understand")
    public ResponseEntity<ApiResponse<GameUnderstandingResponse>> understand(@Valid @RequestBody UnderstandGameRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(understanding.understand(request)));
    }
}
