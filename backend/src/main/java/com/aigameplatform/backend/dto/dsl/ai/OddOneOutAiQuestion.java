package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OddOneOutAiQuestion(
        List<String> items,
        int oddOneOutIndex,
        String audioText) implements AiQuestion {

    @Override
    public List<String> problems() {
        List<String> problems = new ArrayList<>();
        if (oddOneOutIndex < 0 || oddOneOutIndex >= items.size()) {
            problems.add("oddOneOutIndex phải nhỏ hơn số phần tử (" + items.size() + ")");
        }
        return problems;
    }
}
