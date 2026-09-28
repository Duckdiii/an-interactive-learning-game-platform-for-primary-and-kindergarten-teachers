package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderStepDsl(
        String id,
        String text,
        String visualPrompt,
        String imageUrl,
        int correctPosition) {
}
