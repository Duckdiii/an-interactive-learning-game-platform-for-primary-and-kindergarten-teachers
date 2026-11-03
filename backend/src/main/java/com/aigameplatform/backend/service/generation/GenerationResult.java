package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.curriculum.review.*;
import java.util.Objects;

/** Teacher response wrapper; game remains an unmodified v1.0.0 DSL document. */
public record GenerationResult(GameDsl game, CurriculumEvidence evidence, CurriculumEvidenceReview review) {
    public GenerationResult {
        Objects.requireNonNull(game);
        Objects.requireNonNull(evidence);
        Objects.requireNonNull(review);
    }
}
