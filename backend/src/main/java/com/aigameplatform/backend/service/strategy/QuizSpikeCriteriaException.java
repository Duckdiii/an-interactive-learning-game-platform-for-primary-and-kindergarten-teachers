package com.aigameplatform.backend.service.strategy;

public class QuizSpikeCriteriaException extends IllegalArgumentException {

    /** Creates a validation failure for an output that violates spike-specific rules. */
    public QuizSpikeCriteriaException(String message) {
        super(message);
    }
}
