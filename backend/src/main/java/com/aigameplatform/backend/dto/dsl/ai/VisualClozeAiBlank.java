package com.aigameplatform.backend.dto.dsl.ai;

/** Candidate blank grounded in the supplied scene; coordinates are source-image pixel centers. */
public record VisualClozeAiBlank(String id, Double x, Double y, String correctOptionId) {
}
