package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TextChoiceDsl(
        String id,
        String text,
        String assetId,
        String imageUrl) {
    public TextChoiceDsl(String id, String text) { this(id, text, null, null); }
}
