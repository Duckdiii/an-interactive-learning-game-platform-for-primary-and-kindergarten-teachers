package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
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

    @Test void reportsDecisionErrorsEvidenceRescueRankingLatencyAndSmallSampleIntervals() {
        var supported = query("positive", true);
        var rejected = new CurriculumBenchmark.Row(supported, true, false, 0, 10, 2, false, true, 1.0);
        var acceptedUnsupported = new CurriculumBenchmark.Row(query("negative", false), false, true, 0, 20, 3, false, false, 0.0);
        var summary = CurriculumBenchmark.summarize(List.of(rejected, acceptedUnsupported));
        assertThat(summary.falseRejections()).isEqualTo(1);
        assertThat(summary.falseRejectionRate()).isEqualTo(1.0);
        assertThat(summary.falseAcceptanceRate()).isEqualTo(1.0);
        assertThat(summary.suggestionRescueRate()).isEqualTo(1.0);
        assertThat(summary.retrievalP50Millis()).isEqualTo(10);
        assertThat(summary.retrievalAndVerificationP95Millis()).isEqualTo(23);
        assertThat(summary.falseRejectionInterval().lower()).isLessThan(1.0);
        assertThat(summary.falseRejectionInterval().upper()).isEqualTo(1.0);
        assertThat(CurriculumBenchmark.summarizeByScopeAndStyle(List.of(rejected)))
                .containsKey("MATH/GRADE_1/LEGACY");
    }

    @Test void kindergartenBenchmarkRunsWithoutElementaryRuleVerifierOrSubjectFiltering() throws Exception {
        var dataset = CurriculumDataset.loadKindergarten();
        var target = dataset.chunks().stream().filter(c -> !c.control()).findFirst().orElseThrow();
        var store = new InMemoryEmbeddingStore<TextSegment>();
        store.add(Embedding.from(new float[]{1, 0}), target.toSegment(dataset.source(), "model"));
        EmbeddingModel queryModel = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var retriever = new CurriculumRAGService(store, queryModel, dataset.source(), "model", 3, 0.9);
        var supported = new CurriculumBenchmark.Query("kg-positive", "count-intent", "SUPPORTED", "Count objects",
                Subject.ENGLISH, GradeLevel.KINDERGARTEN, true, List.of(target.chunkId()),
                "ACTIVITY", "writer", List.of("labeler"), "DEV", target.ageBand());
        var rows = CurriculumBenchmark.evaluateKindergarten(retriever, dataset,
                List.of(supported), 8, 0.9);
        assertThat(rows).singleElement().satisfies(row -> {
            assertThat(row.accepted()).isTrue();
            assertThat(row.evidenceCorrect()).isTrue();
            assertThat(row.leakedChunks()).isZero();
        });
    }
}
