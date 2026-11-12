package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.media.LoadedSceneImage;
import java.util.List;
import java.util.Map;

/** Checks every generated question's answer and support against the exact retrieved curriculum evidence. */
public interface GeneratedContentReviewer {
    record Result(List<ValidationError> errors, CurriculumEvidenceReview review, boolean visualOnlyAccepted) {
        public Result(List<ValidationError> errors, CurriculumEvidenceReview review) {
            this(errors, review, false);
        }
        public Result { errors = List.copyOf(errors); }
        public boolean accepted() {
            return errors.isEmpty() && (visualOnlyAccepted || review != null && !review.claims().isEmpty()
                    && (review.status() == CurriculumEvidenceReview.Status.PENDING
                        || review.status() == CurriculumEvidenceReview.Status.REVIEWED));
        }
    }

    Result review(GameDsl game, String teacherTopic, CurriculumEvidence evidence);

    default Result review(GameDsl game, String teacherTopic, CurriculumEvidence evidence, LoadedSceneImage sceneImage) {
        throw new AiServiceUnavailableException("Multimodal content review is not available");
    }

    default Result review(GameDsl game, String teacherTopic, CurriculumEvidence evidence, LoadedSceneImage sceneImage,
            Map<String, LoadedSceneImage> optionImages) {
        return review(game, teacherTopic, evidence, sceneImage);
    }
}
