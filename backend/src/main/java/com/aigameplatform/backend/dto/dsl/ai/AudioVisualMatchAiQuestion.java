package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AudioVisualMatchAiQuestion(
        String audioText,
        AiImage correct,
        List<AiImage> distractors) implements AiQuestion {
}
