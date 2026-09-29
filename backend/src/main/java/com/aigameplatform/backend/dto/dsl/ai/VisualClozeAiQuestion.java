package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VisualClozeAiQuestion(
        String sentenceTemplate,
        String visualPrompt,
        String correctAnswer,
        List<String> distractors,
        String audioText) implements AiQuestion {
}
