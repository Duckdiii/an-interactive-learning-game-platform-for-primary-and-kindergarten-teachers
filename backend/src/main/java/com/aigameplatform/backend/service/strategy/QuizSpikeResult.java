package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;

/** Holds the validated quiz DTO together with the original model response text. */
public record QuizSpikeResult(QuizAiOutput output, String rawOutput) {
}
