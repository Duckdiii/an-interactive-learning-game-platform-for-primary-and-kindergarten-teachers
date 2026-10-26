package com.aigameplatform.backend.exception;

/** Curriculum retrieval is enabled but its store or embedding service cannot be used. */
public class CurriculumServiceUnavailableException extends ApiException {
    public CurriculumServiceUnavailableException(String message, Throwable cause) {
        super(ErrorCode.CURRICULUM_UNAVAILABLE, message, cause);
    }
}
