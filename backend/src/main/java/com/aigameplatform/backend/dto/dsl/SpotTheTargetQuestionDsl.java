package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpotTheTargetQuestionDsl(
        String id,
        int timeLimitSeconds,
        int points,
        String audioText,
        String audioUrl,
        String visualPrompt,
        String imageUrl,
        String targetDescription,
        HitRegionDsl hitRegion) implements QuestionDsl {
}
