package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VisualClozeQuestionDsl(
        String id,
        int timeLimitSeconds,
        int points,
        String audioText,
        String audioUrl,
        String visualPrompt,
        String imageUrl,
        String sentenceTemplate,
        String correctAnswer,
        List<String> distractors,
        String questionText,
        String sceneImageUrl,
        Integer sceneWidth,
        Integer sceneHeight,
        List<VisualClozeBlankDsl> blanks,
        List<VisualClozeImageOptionDsl> options) implements QuestionDsl {

    public VisualClozeQuestionDsl(String id, int timeLimitSeconds, int points, String audioText, String audioUrl,
            String visualPrompt, String imageUrl, String sentenceTemplate, String correctAnswer,
            List<String> distractors) {
        this(id, timeLimitSeconds, points, audioText, audioUrl, visualPrompt, imageUrl, sentenceTemplate,
                correctAnswer, distractors, null, null, null, null, null, null);
    }
}
