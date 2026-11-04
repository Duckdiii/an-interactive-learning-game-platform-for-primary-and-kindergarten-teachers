package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;

public record GameRecommendationResponse(
    List<GameRecommendationItem> recommendations
) {
    public record GameRecommendationItem(
        String title,
        GameType gameType,
        String bloomLevel,
        String description,
        String estimatedDuration,
        String track
    ) {}
}
