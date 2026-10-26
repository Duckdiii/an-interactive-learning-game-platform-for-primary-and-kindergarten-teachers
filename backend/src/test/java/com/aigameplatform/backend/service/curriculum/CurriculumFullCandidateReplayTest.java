package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Current verifier replay on exposed historical candidates. No live retrieval or independent holdout claim. */
class CurriculumFullCandidateReplayTest {
    @Test
    void preservesPerScopeDevelopmentGatesOnAll195HistoricalCandidateSets() throws Exception {
        var mapper = new JsonMapper();
        var input = Path.of("../docs/rag-spike/results/live-2026-10-14T05-46-12.101293900Z.json");
        var report = mapper.readTree(Files.readString(input, StandardCharsets.UTF_8));
        var scopes = new ArrayList<Map<String, Object>>();
        var verifier = new CurriculumEvidenceVerifier();
        int total = 0;
        for (var scope : report.get("scopeResults")) {
            var subject = Subject.valueOf(scope.get("subject").asString());
            var grade = GradeLevel.valueOf(scope.get("gradeLevel").asString());
            var rows = new ArrayList<CurriculumEvaluation.EvaluationRow>();
            for (var row : scope.get("queries")) {
                var candidates = new ArrayList<CurriculumRAGService.RetrievedChunk>();
                for (var candidate : row.get("candidates")) {
                    candidates.add(mapper.treeToValue(candidate, CurriculumRAGService.RetrievedChunk.class));
                }
                var decision = verifier.verify(row.get("topic").asString(), subject, grade, candidates);
                var selected = candidates.stream().filter(c -> decision.supportingChunkIds().contains(c.chunkId())).toList();
                var result = new CurriculumRAGService.RetrievalResult(decision.supported()
                        ? CurriculumRAGService.Status.FOUND : CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE,
                        selected, decision.reasonCode(), candidates, decision.evidenceSupports());
                var expected = new ArrayList<String>();
                row.get("expectedChunkIds").forEach(id -> expected.add(id.asString()));
                var query = new CurriculumEvaluation.EvaluationQuery(row.get("queryId").asString(),
                        row.get("topic").asString(), expected, row.get("negative").asBoolean());
                rows.add(CurriculumEvaluation.score(query, result, 0, subject, grade));
            }
            var summary = CurriculumEvaluation.summarize(rows);
            assertThat(summary.passed()).as("historical candidate replay %s/%s", subject, grade).isTrue();
            scopes.add(Map.of("subject", subject, "gradeLevel", grade, "queries", rows, "summary", summary));
            total += rows.size();
        }
        assertThat(scopes).hasSize(15);
        assertThat(total).isEqualTo(195);
        Files.writeString(Path.of("../docs/rag-spike/results/offline-candidate-replay-2026-10-23.json"),
                mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
                        "measurementStatus", "OFFLINE_CURRENT_VERIFIER_ON_HISTORICAL_CANDIDATES",
                        "sourceReport", input.getFileName().toString(), "liveRetrieval", false,
                        "independentHoldout", false, "scopeResults", scopes)), StandardCharsets.UTF_8);
    }
}
