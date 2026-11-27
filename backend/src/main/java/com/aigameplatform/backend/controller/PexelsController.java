package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.media.PexelsImageDto;
import com.aigameplatform.backend.dto.media.PexelsSearchResult;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.service.media.PexelsClient;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/media")
public class PexelsController {

    private final PexelsClient pexelsClient;

    public PexelsController(PexelsClient pexelsClient) {
        this.pexelsClient = pexelsClient;
    }

    @GetMapping("/pexels-search")
    public ApiResponse<PexelsSearchResult> search(
            @RequestParam(name = "query", defaultValue = "") String query,
            @RequestParam(name = "perPage", defaultValue = "12") int perPage) {
        List<PexelsImageDto> images = pexelsClient.search(query, perPage);
        return ApiResponse.success(new PexelsSearchResult(images));
    }
}
