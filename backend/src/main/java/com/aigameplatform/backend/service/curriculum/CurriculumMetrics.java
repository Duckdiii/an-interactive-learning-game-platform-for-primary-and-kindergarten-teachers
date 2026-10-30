package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.*;
import io.micrometer.core.instrument.*;
import java.util.concurrent.TimeUnit;
import java.util.function.*;

/** Finite labels only; this API cannot accept a topic, prompt, user or chunk ID as a label. */
public final class CurriculumMetrics {
    public enum Stage { QUERY_EMBEDDING, RETRIEVAL, VERIFICATION, GENERATION, TOTAL }
    public enum Outcome { SUCCESS, REJECTED, UNSUPPORTED, UNAVAILABLE, UNSAFE }
    private static final CurriculumMetrics NOOP = new CurriculumMetrics(null);
    private final MeterRegistry registry;
    public CurriculumMetrics(MeterRegistry registry) { this.registry = registry; }
    public static CurriculumMetrics noop() { return NOOP; }

    public <T> T measure(Stage stage, Subject subject, GradeLevel grade, Supplier<T> operation, Function<T, Outcome> outcome) {
        long start = System.nanoTime();
        Outcome result = Outcome.UNAVAILABLE;
        try {
            T value = operation.get();
            result = outcome.apply(value);
            return value;
        } catch (CurriculumEvidenceNotFoundException e) { result = Outcome.REJECTED; throw e; }
        catch (GenerationScopeUnsupportedException e) { result = Outcome.UNSUPPORTED; throw e; }
        catch (UnsafeContentException e) { result = Outcome.UNSAFE; throw e; }
        finally {
            if (registry != null) {
                try {
                var tags = Tags.of("stage", stage.name(), "outcome", result.name(),
                        "subject", subject == null ? "UNKNOWN" : subject.name(), "gradeLevel", grade == null ? "UNKNOWN" : grade.name());
                registry.counter("curriculum.requests", tags).increment();
                io.micrometer.core.instrument.Timer.builder("curriculum.duration").tags(tags)
                        .publishPercentiles(0.5, 0.95).register(registry).record(System.nanoTime() - start, TimeUnit.NANOSECONDS);
                } catch (RuntimeException ignored) {
                    // Observability must never replace a game result or the original domain exception.
                }
            }
        }
    }
}
