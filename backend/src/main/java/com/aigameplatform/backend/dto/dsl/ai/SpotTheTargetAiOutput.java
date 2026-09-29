package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpotTheTargetAiOutput(
        List<SpotTheTargetAiQuestion> questions) implements AiGameOutput {
}
