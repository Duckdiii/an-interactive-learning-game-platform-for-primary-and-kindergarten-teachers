package com.aigameplatform.backend.dto.admin;

import java.time.Instant;

public record AiConfigVersionDto(
        String versionId,
        String systemPrompt,
        Double temperature,
        Integer maxTokens,
        Double moderationThreshold,
        String label,
        boolean frozen,
        boolean active,
        String sha256,
        Instant createdAt,
        String createdBy
) {
}
