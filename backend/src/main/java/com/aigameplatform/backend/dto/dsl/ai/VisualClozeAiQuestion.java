package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VisualClozeAiQuestion(
        String sentenceTemplate,
        String visualPrompt,
        String correctAnswer,
        List<String> distractors,
        String audioText,
        String questionText,
        List<VisualClozeAiBlank> blanks,
        List<VisualClozeAiImageOption> options) implements AiQuestion {

    public VisualClozeAiQuestion(String sentenceTemplate, String visualPrompt, String correctAnswer,
            List<String> distractors, String audioText) {
        this(sentenceTemplate, visualPrompt, correctAnswer, distractors, audioText, null, null, null);
    }
}
