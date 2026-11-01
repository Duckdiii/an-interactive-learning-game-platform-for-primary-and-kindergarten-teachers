package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.exception.HttpException;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;

class CurriculumRuntimeCheckpointTest {
    @TempDir Path tempDir;

    @Test void resumesOnlyQuestionsWithoutADecisionAndRejectsConfigurationDrift() throws Exception {
        var supported = outcome("q-supported", "SUPPORTED", null);
        var refused = outcome("q-refused", "INSUFFICIENT_EVIDENCE", null);
        var unavailable = outcome("q-pending", "SERVICE_UNAVAILABLE", "QUOTA");
        var file = tempDir.resolve("run.checkpoint.jsonl");

        try (var checkpoint = CurriculumRuntimeCheckpoint.open(file, "fingerprint-a")) {
            checkpoint.record(supported);
            checkpoint.record(refused);
            checkpoint.record(unavailable);
        }

        try (var resumed = CurriculumRuntimeCheckpoint.open(file, "fingerprint-a")) {
            assertThat(resumed.completedQueryIds()).containsExactlyInAnyOrder("q-supported", "q-refused");
            assertThat(resumed.pendingQueryIds(List.of("q-supported", "q-refused", "q-pending")))
                    .containsExactly("q-pending");
            assertThat(resumed.latestOutcomes()).hasSize(3);
        }

        assertThatThrownBy(() -> CurriculumRuntimeCheckpoint.open(file, "fingerprint-b"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("fingerprint");
    }

    @Test void syntheticQueryEmbeddingCacheReusesExactModelConfigurationOnly() throws Exception {
        var calls = new AtomicInteger();
        EmbeddingModel delegate = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                calls.incrementAndGet();
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{0.25f, 0.75f})).toList());
            }
        };
        var file = tempDir.resolve("synthetic-query-vectors.jsonl");

        try (var first = new BenchmarkQueryEmbeddingCache(delegate, file, "gemini-embedding-001", "dataset-v1", "cfg-a", 2)) {
            first.embedAll(List.of(TextSegment.from("synthetic benchmark query")));
            assertThat(first.stats().freshVectors()).isEqualTo(1);
            assertThat(first.stats().reusedVectors()).isZero();
        }
        try (var resumed = new BenchmarkQueryEmbeddingCache(delegate, file, "gemini-embedding-001", "dataset-v1", "cfg-a", 2)) {
            resumed.embedAll(List.of(TextSegment.from("synthetic benchmark query")));
            assertThat(resumed.stats().freshVectors()).isZero();
            assertThat(resumed.stats().reusedVectors()).isEqualTo(1);
        }
        assertThatThrownBy(() -> new BenchmarkQueryEmbeddingCache(delegate, file,
                "gemini-embedding-001", "dataset-v1", "cfg-b", 2))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("configuration");
        assertThat(calls).hasValue(1);
    }

    @Test void serviceFailureClassificationRequiresEvidenceAndRecognizesQuotaStatus() {
        assertThat(CurriculumRuntimeEvaluation.classifyServiceFailure(
                new com.aigameplatform.backend.exception.CurriculumServiceUnavailableException("safe", null)))
                .isEqualTo("CAUSE_NOT_RETAINED");
        assertThat(CurriculumRuntimeEvaluation.classifyServiceFailure(
                new com.aigameplatform.backend.exception.CurriculumServiceUnavailableException("safe",
                        new HttpException(429, "quota"))))
                .isEqualTo("QUOTA");
        assertThat(CurriculumRuntimeEvaluation.classifyServiceFailure(
                new com.aigameplatform.backend.exception.CurriculumServiceUnavailableException("safe",
                        new HttpException(400, "bad request"))))
                .isEqualTo("HTTP_400");
    }

    @Test void importingPreviousExploratoryReportKeepsDecisionsAndMarksUnknownFailuresPending() throws Exception {
        var previousDecision = outcome("q-supported", "SUPPORTED", null);
        var previousFailure = outcome("q-pending", "SERVICE_UNAVAILABLE", null);
        var report = Map.of("mode", "--exploratory", "labelReview", "AI_AUTHORED_UNREVIEWED", "scopes",
                Map.of("dataset-v1", Map.of("outcomes", List.of(previousDecision, previousFailure))));
        var oldReport = tempDir.resolve("live-dev.json");
        Files.writeString(oldReport, new JsonMapper().writeValueAsString(report));
        var checkpointPath = tempDir.resolve("resume.checkpoint.jsonl");

        try (var checkpoint = CurriculumRuntimeCheckpoint.openOrImport(checkpointPath, "fp", oldReport,
                "dataset-v1", List.of(previousDecision.query(), previousFailure.query()))) {
            assertThat(checkpoint.completedQueryIds()).containsExactly("q-supported");
            assertThat(checkpoint.pendingQueryIds(List.of("q-supported", "q-pending"))).containsExactly("q-pending");
            assertThat(checkpoint.latestOutcomes()).filteredOn(o -> o.query().queryId().equals("q-pending"))
                    .singleElement().extracting(CurriculumRuntimeEvaluation.Outcome::serviceFailureCategory)
                    .isEqualTo("CAUSE_NOT_CAPTURED_IN_PRIOR_RUN");
        }
    }

    @Test void refusesToStartFullReplayWhenLegacyReportHasNoPerQueryRows() throws Exception {
        var blocked = tempDir.resolve("live-dev.json");
        Files.writeString(blocked, new JsonMapper().writeValueAsString(Map.of("mode", "--exploratory",
                "labelReview", "AI_AUTHORED_UNREVIEWED", "failureType", "SQLTransientConnectionException",
                "scopes", Map.of("dataset-v1", Map.of("liveEvaluation", "NOT_RUN")))));
        var checkpointPath = tempDir.resolve("resume.checkpoint.jsonl");

        assertThatThrownBy(() -> CurriculumRuntimeCheckpoint.openOrImport(checkpointPath, "fp", blocked,
                "dataset-v1", List.of(outcome("q", "SUPPORTED", null).query())))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("refusing to replay completed work");
        assertThat(Files.exists(checkpointPath)).isFalse();
    }

    private static CurriculumRuntimeEvaluation.Outcome outcome(String id, String status, String failureCategory) {
        var query = new CurriculumBenchmark.Query(id, id, "SUPPORTED", "Synthetic " + id, Subject.ENGLISH,
                GradeLevel.GRADE_1, true, List.of("en-g1-001"), "AI_DRAFT", "AI_CODEX", List.of(), "DEV");
        return new CurriculumRuntimeEvaluation.Outcome(query, status, List.of(), List.of(), 1, 1, 0,
                failureCategory, failureCategory == null ? null : "AFTER_RANKING");
    }
}
