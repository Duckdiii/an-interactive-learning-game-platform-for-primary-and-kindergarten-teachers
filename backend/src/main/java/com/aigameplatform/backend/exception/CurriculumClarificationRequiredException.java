package com.aigameplatform.backend.exception;

/** The teacher must specify a missing curriculum scope or constraint before evidence can be evaluated. */
public class CurriculumClarificationRequiredException extends ApiException {
    public CurriculumClarificationRequiredException(String message) {
        super(ErrorCode.CURRICULUM_CLARIFICATION_REQUIRED, message);
    }
}
