package com.aigameplatform.backend.dto.session;

public record LeaderboardParticipantDto(
        int rank,
        String nickname,
        int score,
        String teamId,
        String participantId
) {
}
