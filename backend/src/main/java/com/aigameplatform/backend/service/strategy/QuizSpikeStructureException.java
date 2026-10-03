package com.aigameplatform.backend.service.strategy;

public class QuizSpikeStructureException extends IllegalArgumentException {

    /** Creates a structural validation failure with a concise diagnostic. */
    public QuizSpikeStructureException(String message) {
        super(message);
    }

    /** Creates a structural validation failure while retaining its parsing cause. */
    public QuizSpikeStructureException(String message, Throwable cause) {
        super(message, cause);
    }
}
