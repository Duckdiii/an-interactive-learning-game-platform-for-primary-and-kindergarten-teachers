package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;

public record QuizSpikeResult(QuizAiOutput output, String rawOutput) {
}
