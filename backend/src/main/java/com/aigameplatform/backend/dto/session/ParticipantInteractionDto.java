package com.aigameplatform.backend.dto.session;

public record ParticipantInteractionDto(
        String questionId,
        int questionIndex,
        boolean isCorrect,
        int pointsEarned,
        int timeSpentMs,
        String answeredAt,
        Object answer,
        Object correctAnswer
) {
}
