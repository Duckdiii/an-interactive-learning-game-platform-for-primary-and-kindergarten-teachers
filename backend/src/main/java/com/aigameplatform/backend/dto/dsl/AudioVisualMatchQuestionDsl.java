package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AudioVisualMatchQuestionDsl(
        String id,
        int timeLimitSeconds,
        int points,
        String audioText,
        String audioUrl,
        String visualPrompt,
        String imageUrl,
        ImageChoiceDsl correct,
        List<ImageChoiceDsl> distractors) implements QuestionDsl {
}
