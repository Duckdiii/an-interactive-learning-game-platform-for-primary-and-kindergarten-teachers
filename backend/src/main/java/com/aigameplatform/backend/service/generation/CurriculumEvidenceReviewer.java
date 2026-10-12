package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.curriculum.CurriculumEvidenceReview;

/** Produces non-blocking curriculum alignment warnings for teachers. */
@FunctionalInterface
public interface CurriculumEvidenceReviewer {
    CurriculumEvidenceReview review(GameDsl game, String curriculumContext);
}