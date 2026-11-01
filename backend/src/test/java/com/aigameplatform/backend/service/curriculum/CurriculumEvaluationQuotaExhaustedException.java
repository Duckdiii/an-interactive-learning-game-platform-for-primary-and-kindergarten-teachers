package com.aigameplatform.backend.service.curriculum;

/** Stops a benchmark batch immediately after the provider proves the model quota is exhausted. */
final class CurriculumEvaluationQuotaExhaustedException extends RuntimeException {
    CurriculumEvaluationQuotaExhaustedException() {
        super("Benchmark stopped after confirmed Gemini quota exhaustion; checkpoint is saved.");
    }
}
