package com.aigameplatform.backend.dto.dsl.ai;

/** Candidate scene-matching answer. Image URLs are untrusted and must pass publication checks. */
public record VisualClozeAiImageOption(String id, String visualPrompt, String imageUrl) {
}
