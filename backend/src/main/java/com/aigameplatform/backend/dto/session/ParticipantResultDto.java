package com.aigameplatform.backend.dto.session;

public record ParticipantResultDto(
        String participantId,
        String nickname,
        int score,
        int rank,
        int correctCount,
        int incorrectCount,
        String teamId
) {
}
