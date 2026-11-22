package com.aigameplatform.backend.dto.session;

public record ParticipantDetailDto(
        String participantId,
        String nickname,
        String status,
        int score,
        int answeredCount,
        String teamId
) {
}
