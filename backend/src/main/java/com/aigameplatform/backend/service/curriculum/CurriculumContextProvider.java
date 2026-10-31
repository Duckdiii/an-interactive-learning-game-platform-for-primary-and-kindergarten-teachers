package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import com.aigameplatform.backend.exception.KindergartenAgeBandRequiredException;

/** Retrieves curriculum evidence for one teacher request before any generation retries begin. */
@FunctionalInterface
public interface CurriculumContextProvider {

    Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel);

    default Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel,
                              KindergartenAgeBand kindergartenAgeBand) {
        if (gradeLevel == GradeLevel.KINDERGARTEN) {
            if (kindergartenAgeBand == null) throw new KindergartenAgeBandRequiredException();
            throw new CurriculumServiceUnavailableException(
                    "Curriculum provider does not support age-filtered kindergarten retrieval", null);
        }
        if (kindergartenAgeBand != null)
            throw new IllegalArgumentException("Age band may only be supplied for kindergarten");
        return retrieve(topic, subject, gradeLevel);
    }

    record Evidence(boolean sufficient, String context,
                    com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence evidence) {
        public Evidence(boolean sufficient, String context) {
            this(sufficient, context, com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.empty());
        }
        public Evidence {
            java.util.Objects.requireNonNull(evidence);
            if (sufficient && (context == null || context.isBlank())) {
                throw new IllegalArgumentException("Sufficient curriculum evidence requires context");
            }
        }

        public static Evidence found(String context) {
            return new Evidence(true, context);
        }

        public static Evidence found(String context,
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence evidence) {
            return new Evidence(true, context, evidence);
        }

        public static Evidence insufficient() {
            return new Evidence(false, "");
        }
    }
}
