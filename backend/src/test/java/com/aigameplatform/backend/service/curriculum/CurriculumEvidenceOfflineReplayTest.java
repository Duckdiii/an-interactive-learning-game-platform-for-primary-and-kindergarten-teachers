package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.Test;

/** Replays the exposed false-acceptance development cases from their saved raw reports. */
class CurriculumEvidenceOfflineReplayTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final List<Path> RAW_REPORTS = List.of(
            Path.of("../docs/rag-spike/results/live-2026-10-11T20-43-36.715406300Z.json"),
            Path.of("../docs/rag-spike/results/live-2026-10-12T04-55-41.946088600Z.json"),
            Path.of("../docs/rag-spike/results/live-2026-10-12T04-56-10.069433500Z.json"),
            Path.of("../docs/rag-spike/results/live-2026-10-12T04-56-34.453026Z.json"),
            Path.of("../docs/rag-spike/results/holdout/math-g1-holdout-v1-2026-10-11T20-44-04.135007200Z.json"),
            Path.of("../docs/rag-spike/results/holdout/math-g2-holdout-v1-2026-10-11T20-44-10.814215600Z.json"),
            Path.of("../docs/rag-spike/results/holdout/math-g3-holdout-v1-2026-10-11T20-44-17.350531100Z.json"));

    @Test
    void rejectsAllPreviouslyExposedFalseAcceptancesFromRawCandidates() throws Exception {
        var replayed = new ArrayList<String>();
        var accepted = new ArrayList<String>();
        for (Path reportPath : RAW_REPORTS) {
            JsonNode report = JSON.readTree(Files.readString(reportPath));
            JsonNode scopes = report.path("scopeResults");
            if (!scopes.isArray()) scopes = JSON.createArrayNode().add(report);
            for (JsonNode scope : scopes) {
                JsonNode rows = scope.path("queries");
                for (JsonNode row : rows) {
                    JsonNode query = row.has("query") ? row.path("query") : row;
                    boolean wasRejected = row.has("rejected") ? row.path("rejected").asBoolean()
                            : "INSUFFICIENT_EVIDENCE".equals(row.path("status").asText());
                    if (wasRejected || query.path("expectedChunkIds").size() != 0
                            || row.path("returned").isEmpty()) continue;

                    String topic = query.path("topic").asText();
                    var candidates = StreamSupport.stream(row.path("returned").spliterator(), false)
                            .map(candidate -> fromJson(scope, candidate)).toList();
                    Subject subject = Subject.valueOf(scope.path("subject").asText());
                    GradeLevel grade = GradeLevel.valueOf(scope.path("gradeLevel").asText());
                    var decision = new CurriculumEvidenceVerifier().verify(topic, subject, grade, candidates);
                    String label = reportPath.getFileName() + "/" + query.path("queryId").asText();
                    replayed.add(label);
                    if (decision.supported()) accepted.add(label + " " + candidates.stream()
                            .map(CurriculumRAGService.RetrievedChunk::chunkId).toList());
                }
            }
        }

        assertThat(replayed).hasSize(11);
        assertThat(accepted).as("offline candidate replay still falsely accepts %s", accepted).isEmpty();
    }

    private static CurriculumRAGService.RetrievedChunk fromJson(JsonNode scope, JsonNode candidate) {
        return new CurriculumRAGService.RetrievedChunk(candidate.path("chunkId").asText(),
                Subject.valueOf(candidate.path("subject").asText(scope.path("subject").asText())),
                GradeLevel.valueOf(candidate.path("gradeLevel").asText(scope.path("gradeLevel").asText())),
                candidate.path("topic").asText(), candidate.path("text").asText(),
                candidate.path("score").asDouble(), candidate.path("sourceDocument").asText(),
                pages(candidate.path("pdfPages").asText()), pages(candidate.path("printedPages").asText()),
                candidate.path("curriculumVersion").asText());
    }

    private static List<Integer> pages(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split(",")).map(Integer::valueOf).toList();
    }
}
