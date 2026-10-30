package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import java.util.*;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class CurriculumBenchmarkTest {
    private CurriculumBenchmark.Query query(String id, boolean supported) {
        return new CurriculumBenchmark.Query(id, "group-" + id, "BOUNDARY", "Đếm", Subject.MATH, GradeLevel.GRADE_1,
                supported, supported ? List.of("math-g1-001") : List.of());
    }
    @Test void metricsSeparateRetrievalVerificationAndFalseAcceptance() {
        var rows = new ArrayList<CurriculumBenchmark.Row>();
        IntStream.range(0, 20).forEach(i -> rows.add(new CurriculumBenchmark.Row(query("p" + i, true),
                i < 18, i < 18, 0, 1, 1)));
        IntStream.range(0, 20).forEach(i -> rows.add(new CurriculumBenchmark.Row(query("n" + i, false), false, false, 0, 1, 1)));
        var summary = CurriculumBenchmark.summarize(rows);
        assertThat(summary.hitAt3()).isEqualTo(0.9);
        assertThat(summary.supportedAcceptance()).isEqualTo(0.9);
        assertThat(summary.falseAcceptances()).isZero();
        assertThat(summary.qualityGatePassed()).isTrue();
        assertThat(CurriculumBenchmark.summarizeCohorts(rows).get("BOUNDARY").supportedQueries()).isEqualTo(20);
        rows.set(20, new CurriculumBenchmark.Row(query("n0", false), false, true, 0, 1, 1));
        assertThat(CurriculumBenchmark.summarize(rows).qualityGatePassed()).isFalse();
        var rejectAll = rows.stream().map(r -> new CurriculumBenchmark.Row(r.query(), r.retrievalHit(), false, 0, 1, 1)).toList();
        assertThat(CurriculumBenchmark.summarize(rejectAll).qualityGatePassed()).isFalse();
    }
    @Test void groupedParaphrasesAndDuplicateIdsCannotPassAsIndependentHoldout() {
        var q = query("one", true);
        assertThatThrownBy(() -> CurriculumBenchmark.requireDisjoint(List.of(q), List.of(q)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(CurriculumBenchmark.summarize(List.of()).qualityGatePassed()).isFalse();
    }
}
