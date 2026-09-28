package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;


@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiDropZone(
        String label) {
}
