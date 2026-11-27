package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VisualClozeImageOptionDsl(String id, String visualPrompt, String imageUrl) {
}
