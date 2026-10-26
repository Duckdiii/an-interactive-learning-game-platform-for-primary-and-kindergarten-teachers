package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public final class CurriculumEvaluation {
    private CurriculumEvaluation() { }

    public record EvaluationQuery(String queryId, String topic, List<String> expectedChunkIds, boolean negative) { }
    public record EvaluationRow(String queryId, String topic, List<String> expectedChunkIds, boolean negative,
                                CurriculumRAGService.Status status, List<CurriculumRAGService.RetrievedChunk> returned,
                                boolean hit, int leakedChunks, long latencyMillis) { }
    public record Summary(int positiveQueries, int hits, double hitAt3, int leakedChunks,
                          int negativeQueries, int negativeRejections, boolean retrievalGatePassed,
                          boolean negativeGatePassed, boolean passed) { }

    public static List<EvaluationQuery> loadQueries() throws IOException {
        var queries = CurriculumDataset.readLines("queries.jsonl", EvaluationQuery.class);
        if (queries.stream().filter(q -> !q.negative()).count() != 10
                || queries.stream().filter(EvaluationQuery::negative).count() != 3
                || queries.stream().map(EvaluationQuery::queryId).distinct().count() != queries.size()
                || queries.stream().anyMatch(q -> q.queryId() == null || q.queryId().isBlank()
                || q.topic() == null || q.topic().isBlank() || q.expectedChunkIds() == null
                || q.negative() != q.expectedChunkIds().isEmpty())) {
            throw new IllegalStateException("Benchmark must contain 10 positive and 3 negative queries with unique IDs");
        }
        return queries;
    }

    public static List<EvaluationRow> evaluate(CurriculumRAGService service, List<EvaluationQuery> queries) {
        var rows = new ArrayList<EvaluationRow>();
        for (var query : queries) {
            long start = System.nanoTime();
            var result = service.retrieve(query.topic(), Subject.MATH, GradeLevel.GRADE_1);
            rows.add(score(query, result, (System.nanoTime() - start) / 1_000_000));
        }
        return List.copyOf(rows);
    }

    public static EvaluationRow score(EvaluationQuery query, CurriculumRAGService.RetrievalResult result, long millis) {
        boolean hit = !query.negative() && result.chunks().stream().limit(3)
                .anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
        int leakage = (int) result.chunks().stream()
                .filter(c -> c.subject() != Subject.MATH || c.gradeLevel() != GradeLevel.GRADE_1).count();
        return new EvaluationRow(query.queryId(), query.topic(), query.expectedChunkIds(), query.negative(),
                result.status(), result.chunks(), hit, leakage, millis);
    }

    public static Summary summarize(List<EvaluationRow> rows) {
        int positive = (int) rows.stream().filter(r -> !r.negative()).count();
        int hits = (int) rows.stream().filter(r -> !r.negative() && r.hit()).count();
        int leaked = rows.stream().mapToInt(EvaluationRow::leakedChunks).sum();
        int negative = rows.size() - positive;
        int rejected = (int) rows.stream().filter(r -> r.negative()
                && r.status() == CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE && r.returned().isEmpty()).count();
        double hitAt3 = positive == 0 ? 0 : (double) hits / positive;
        boolean uniqueQueries = rows.stream().map(EvaluationRow::queryId).distinct().count() == rows.size();
        boolean retrievalPass = uniqueQueries && positive == 10 && hitAt3 >= 0.8 && leaked == 0;
        boolean negativePass = uniqueQueries && negative == 3 && negative == rejected;
        return new Summary(positive, hits, hitAt3, leaked, negative, rejected, retrievalPass,
                negativePass, retrievalPass && negativePass);
    }
}
