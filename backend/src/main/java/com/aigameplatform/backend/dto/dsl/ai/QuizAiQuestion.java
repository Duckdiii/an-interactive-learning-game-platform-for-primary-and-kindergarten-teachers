package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record QuizAiQuestion(
        String text,
        List<String> options,
        int correctIndex,
        String visualPrompt,
        String audioText) implements AiQuestion {

    @Override
    public List<String> problems() {
        List<String> problems = new ArrayList<>();
        if (correctIndex < 0 || correctIndex >= options.size()) {
            problems.add("correctIndex phải nhỏ hơn số đáp án (" + options.size() + ")");
        }
        return problems;
    }
}
