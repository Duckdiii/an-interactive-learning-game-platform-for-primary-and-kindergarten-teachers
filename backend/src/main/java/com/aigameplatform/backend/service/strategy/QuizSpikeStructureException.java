package com.aigameplatform.backend.service.strategy;

public class QuizSpikeStructureException extends IllegalArgumentException {

    public QuizSpikeStructureException(String message) {
        super(message);
    }

    public QuizSpikeStructureException(String message, Throwable cause) {
        super(message, cause);
    }
}
