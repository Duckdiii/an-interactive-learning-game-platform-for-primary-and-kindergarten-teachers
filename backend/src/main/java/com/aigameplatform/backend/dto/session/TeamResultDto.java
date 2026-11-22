package com.aigameplatform.backend.dto.session;

public record TeamResultDto(
        String teamId,
        String teamName,
        String teamColor,
        double score,
        int rank,
        int memberCount
) {
}
