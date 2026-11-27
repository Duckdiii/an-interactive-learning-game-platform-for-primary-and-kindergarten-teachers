package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OddOneOutQuestionDsl(
        String id,
        int timeLimitSeconds,
        int points,
        String audioText,
        String audioUrl,
        String visualPrompt,
        String imageUrl,
        List<TextChoiceDsl> items,
        String oddOneOutId,
        String questionText) implements QuestionDsl {
    public OddOneOutQuestionDsl(String id, int timeLimitSeconds, int points, String audioText, String audioUrl,
            String visualPrompt, String imageUrl, List<TextChoiceDsl> items, String oddOneOutId) {
        this(id, timeLimitSeconds, points, audioText, audioUrl, visualPrompt, imageUrl, items, oddOneOutId, null);
    }
}
