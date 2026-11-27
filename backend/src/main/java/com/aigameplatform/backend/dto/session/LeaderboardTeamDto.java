package com.aigameplatform.backend.dto.session;

public record LeaderboardTeamDto(
        int rank,
        String teamId,
        String teamName,
        String teamColor,
        double score,
        int memberCount
) {
}
