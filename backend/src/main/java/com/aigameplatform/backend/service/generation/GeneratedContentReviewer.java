package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.entity.enums.CurriculumReviewStatus;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;

/** Checks every generated question's answer and support against the exact retrieved curriculum evidence. */
public interface GeneratedContentReviewer {
    record Result(List<ValidationError> errors, CurriculumEvidenceReview review) {
        public Result { errors = List.copyOf(errors); }
        public boolean accepted() {
            return errors.isEmpty() && review != null && !review.claims().isEmpty()
                    && (review.status() == CurriculumReviewStatus.PENDING
                        || review.status() == CurriculumReviewStatus.REVIEWED);
        }
    }

    Result review(GameDsl game, String teacherTopic, CurriculumEvidence evidence);
}
