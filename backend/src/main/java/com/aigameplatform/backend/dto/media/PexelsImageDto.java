package com.aigameplatform.backend.dto.media;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PexelsImageDto(
        long id,
        String url,
        String thumbnailUrl,
        String alt,
        String photographer
) {
    public PexelsImageDto(long id, String url, String thumbnailUrl) {
        this(id, url, thumbnailUrl, "", "");
    }
}
