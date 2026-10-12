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
                                CurriculumRAGService.Status status, String reasonCode,
                                List<CurriculumRAGService.RetrievedChunk> returned,
                                List<CurriculumRAGService.RetrievedChunk> candidates,
                                boolean hit, int leakedChunks, long latencyMillis) {
        public EvaluationRow {
            expectedChunkIds = List.copyOf(expectedChunkIds);
            returned = List.copyOf(returned);
            candidates = List.copyOf(candidates);
        }
    }
    public record Summary(int positiveQueries, int hits, double hitAt3, int leakedChunks,
                          int negativeQueries, int negativeRejections, boolean retrievalGatePassed,
                          boolean negativeGatePassed, boolean passed) { }

    public static List<EvaluationQuery> loadQueries() throws IOException {
        return loadQueries(Subject.MATH, GradeLevel.GRADE_1);
    }

    public static List<EvaluationQuery> loadQueries(Subject subject, GradeLevel gradeLevel) throws IOException {
        var root = CurriculumDataset.resourceRootFor(subject, gradeLevel);
        var queries = CurriculumDataset.readLines(root, "queries.jsonl", EvaluationQuery.class);
        if (queries.stream().filter(q -> !q.negative()).count() != 10
                || queries.stream().filter(EvaluationQuery::negative).count() != 3
                || queries.stream().map(EvaluationQuery::queryId).distinct().count() != queries.size()
                || queries.stream().anyMatch(q -> q.queryId() == null || q.queryId().isBlank()
                || q.topic() == null || q.topic().isBlank() || q.expectedChunkIds() == null
                || q.negative() != q.expectedChunkIds().isEmpty())) {
            throw new IllegalStateException("Benchmark must contain 10 positive and 3 negative queries with unique IDs");
        }
        var dataset = CurriculumDataset.loadAllReviewed().stream().filter(d -> d.chunks().stream()
                .anyMatch(c -> !c.control() && c.subject() == subject && c.gradeLevel() == gradeLevel)).findFirst()
                .orElseThrow(() -> new IllegalStateException("No reviewed curriculum dataset for query scope"));
        var primaryIds = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        if (queries.stream().filter(q -> !q.negative()).flatMap(q -> q.expectedChunkIds().stream())
                .anyMatch(id -> !primaryIds.contains(id))) {
            throw new IllegalStateException("Evaluation gold IDs must resolve to primary outcomes in the requested scope");
        }
        return queries;
    }

    public static List<EvaluationRow> evaluate(CurriculumRAGService service, List<EvaluationQuery> queries) {
        return evaluate(service, queries, Subject.MATH, GradeLevel.GRADE_1);
    }

    public static List<EvaluationRow> evaluate(CurriculumRAGService service, List<EvaluationQuery> queries,
                                                Subject subject, GradeLevel gradeLevel) {
        var rows = new ArrayList<EvaluationRow>();
        for (var query : queries) {
            long start = System.nanoTime();
            var result = service.retrieve(query.topic(), subject, gradeLevel);
            rows.add(score(query, result, (System.nanoTime() - start) / 1_000_000, subject, gradeLevel));
        }
        return List.copyOf(rows);
    }

    public static EvaluationRow score(EvaluationQuery query, CurriculumRAGService.RetrievalResult result, long millis) {
        return score(query, result, millis, Subject.MATH, GradeLevel.GRADE_1);
    }

    public static EvaluationRow score(EvaluationQuery query, CurriculumRAGService.RetrievalResult result, long millis,
                                      Subject subject, GradeLevel gradeLevel) {
        boolean hit = !query.negative() && result.chunks().stream().limit(3)
                .anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
        int leakage = (int) result.chunks().stream()
                .filter(c -> c.subject() != subject || c.gradeLevel() != gradeLevel).count();
        return new EvaluationRow(query.queryId(), query.topic(), query.expectedChunkIds(), query.negative(),
                result.status(), result.reasonCode(), result.chunks(), result.candidates(), hit, leakage, millis);
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
