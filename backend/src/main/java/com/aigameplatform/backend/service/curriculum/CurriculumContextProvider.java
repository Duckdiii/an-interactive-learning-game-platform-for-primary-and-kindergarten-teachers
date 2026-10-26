package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

/** Retrieves curriculum evidence for one teacher request before any generation retries begin. */
@FunctionalInterface
public interface CurriculumContextProvider {

    Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel);

    record Evidence(boolean sufficient, String context) {
        public Evidence {
            if (sufficient && (context == null || context.isBlank())) {
                throw new IllegalArgumentException("Sufficient curriculum evidence requires context");
            }
        }

        public static Evidence found(String context) {
            return new Evidence(true, context);
        }

        public static Evidence insufficient() {
            return new Evidence(false, "");
        }
    }
}
