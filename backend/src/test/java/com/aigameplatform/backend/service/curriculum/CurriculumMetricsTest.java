package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class CurriculumMetricsTest {
    @Test void brokenRegistryCannotReplaceResultsOrBusinessErrors() {
        var registry = org.mockito.Mockito.mock(io.micrometer.core.instrument.MeterRegistry.class);
        org.mockito.Mockito.when(registry.counter(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.<Iterable<io.micrometer.core.instrument.Tag>>any()))
                .thenThrow(new IllegalStateException("broken exporter"));
        var metrics = new CurriculumMetrics(registry);
        assertThat(metrics.measure(CurriculumMetrics.Stage.TOTAL, Subject.MATH, GradeLevel.GRADE_1,
                () -> "game", v -> CurriculumMetrics.Outcome.SUCCESS)).isEqualTo("game");
        var original = new com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException("missing evidence");
        assertThatThrownBy(() -> metrics.measure(CurriculumMetrics.Stage.TOTAL, Subject.MATH, GradeLevel.GRADE_1,
                () -> { throw original; }, v -> CurriculumMetrics.Outcome.SUCCESS)).isSameAs(original);
    }
    @Test void metricsUseOnlyFiniteLabelsAndRecordFailurePaths() {
        var registry = new SimpleMeterRegistry();
        try {
            var metrics = new CurriculumMetrics(registry);
            String result = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, Subject.MATH, GradeLevel.GRADE_1,
                    () -> "CANARY_TEACHER_SECRET", value -> CurriculumMetrics.Outcome.SUCCESS);
            assertThat(result).isEqualTo("CANARY_TEACHER_SECRET");
            assertThatThrownBy(() -> metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, Subject.MATH, GradeLevel.GRADE_1,
                    () -> { throw new CurriculumServiceUnavailableException("CANARY_PROVIDER_SECRET", null); },
                    value -> CurriculumMetrics.Outcome.SUCCESS)).isInstanceOf(CurriculumServiceUnavailableException.class);
            assertThat(registry.get("curriculum.duration").tag("outcome", "SUCCESS").timer().count()).isEqualTo(1);
            assertThat(registry.get("curriculum.duration").tag("outcome", "UNAVAILABLE").timer().count()).isEqualTo(1);
            assertThat(registry.getMeters()).allSatisfy(meter -> {
                assertThat(meter.getId().toString()).doesNotContain("CANARY", "topic", "userId", "chunkId");
                assertThat(meter.getId().getTags()).filteredOn(tag -> !tag.getKey().equals("phi"))
                        .extracting(io.micrometer.core.instrument.Tag::getKey)
                        .containsOnly("stage", "outcome", "subject", "gradeLevel");
                if (meter.getId().getTag("phi") != null)
                    assertThat(meter.getId().getTag("phi")).isIn("0.5", "0.95");
            });
        } finally { registry.close(); }
    }
}
