package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

/** Retrieves curriculum evidence for one teacher request before any generation retries begin. */
@FunctionalInterface
public interface CurriculumContextProvider {

    Evidence retrieve(String topic, Subject subject, GradeLevel gradeLevel);

    record Evidence(Status status, String context) {
        public Evidence {
            if (status == null || (status == Status.FOUND && (context == null || context.isBlank()))) {
                throw new IllegalArgumentException("Sufficient curriculum evidence requires context");
            }
        }

        public enum Status { FOUND, INSUFFICIENT_EVIDENCE, UNSUPPORTED_SCOPE }

        public boolean sufficient() {
            return status == Status.FOUND;
        }

        public static Evidence found(String context) {
            return new Evidence(Status.FOUND, context);
        }

        public static Evidence insufficient() {
            return new Evidence(Status.INSUFFICIENT_EVIDENCE, "");
        }

        public static Evidence unsupported() {
            return new Evidence(Status.UNSUPPORTED_SCOPE, "");
        }
    }
}
