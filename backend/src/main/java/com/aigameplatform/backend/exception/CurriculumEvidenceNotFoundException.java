package com.aigameplatform.backend.exception;

/** The curriculum retriever found no sufficiently relevant evidence for the requested topic. */
public class CurriculumEvidenceNotFoundException extends ApiException {
    public CurriculumEvidenceNotFoundException(String message) {
        super(ErrorCode.CURRICULUM_EVIDENCE_NOT_FOUND, message);
    }
}
