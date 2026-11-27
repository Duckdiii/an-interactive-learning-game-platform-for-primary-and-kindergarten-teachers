package com.aigameplatform.backend.dto.media;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PexelsSearchResult(
        List<PexelsImageDto> images
) {
    public PexelsSearchResult {
        if (images == null) {
            images = List.of();
        }
    }
}
