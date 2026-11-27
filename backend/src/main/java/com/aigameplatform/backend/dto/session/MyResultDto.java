package com.aigameplatform.backend.dto.session;

public record MyResultDto(
        String participantId,
        String nickname,
        String status,
        int score,
        int correctCount,
        int incorrectCount,
        int totalQuestions,
        int answeredCount,
        Integer rank,
        TeamInfo team
) {
}
