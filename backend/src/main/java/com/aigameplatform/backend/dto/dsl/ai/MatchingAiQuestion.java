package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MatchingAiQuestion(
        List<AiPair> pairs,
        String audioText) implements AiQuestion {
}
