package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Frozen, source-cited holdout kept separate from exploratory retrieval queries. */
public final class CurriculumHoldout {
    private CurriculumHoldout() { }

    public enum Kind { POSITIVE, NEGATIVE, NEAR_MISS }
    public record Query(String queryId, Kind kind, String topic, List<String> expectedChunkIds,
                        String sourceSha256, String sourceDocument, int sourcePdfPage, String goldRationale) {
        public Query { expectedChunkIds = expectedChunkIds == null ? List.of() : List.copyOf(expectedChunkIds); }
    }
    public record Row(Query query, List<CurriculumRAGService.RetrievedChunk> returned,
                      List<CurriculumRAGService.RetrievedChunk> candidates, String reasonCode,
                      boolean rejected, int leakedChunks, long latencyMillis,
                      List<CurriculumEvidenceVerifier.EvidenceSupport> evidenceSupports) {
        public Row {
            returned = List.copyOf(returned);
            candidates = List.copyOf(candidates);
            evidenceSupports = List.copyOf(evidenceSupports);
        }
        public Row(Query query, List<CurriculumRAGService.RetrievedChunk> returned,
                   List<CurriculumRAGService.RetrievedChunk> candidates, String reasonCode,
                   boolean rejected, int leakedChunks, long latencyMillis) {
            this(query, returned, candidates, reasonCode, rejected, leakedChunks, latencyMillis, List.of());
        }
        public Row(Query query, List<CurriculumRAGService.RetrievedChunk> returned,
                   boolean rejected, int leakedChunks, long latencyMillis) {
            this(query, returned, returned, rejected ? "INSUFFICIENT_EVIDENCE" : "SUPPORTED",
                    rejected, leakedChunks, latencyMillis, List.of());
        }
        public boolean hit() { return query.kind() == Kind.POSITIVE && returned.stream().limit(3)
                .anyMatch(c -> query.expectedChunkIds().contains(c.chunkId())); }
        public boolean falseAcceptance() { return query.kind() != Kind.POSITIVE && !rejected; }
        public boolean falseRejection() { return query.kind() == Kind.POSITIVE && !hit(); }
    }
    public record Summary(int queryCount, int positiveQueries, int hits, String hitAt3Fraction,
                          int negativeQueries, int negativeRejections, String negativeRejectionFraction,
                          int nearMissQueries, int nearMissRejections, String nearMissRejectionFraction,
                          int falseRejections, String falseRejectionFraction,
                          int falseAcceptances, String falseAcceptanceFraction,
                          int leakedChunks, boolean passed) { }
    public record Run(String runId, String runType, Instant measuredAtUtc, Subject subject, GradeLevel gradeLevel,
                      String embeddingModel, int embeddingDimension, int topK, double productionMinScore,
                      String sourceSha256, String fixtureSha256, long queryCacheHits, long queryProviderMisses,
                      Summary summary, List<Row> queries) { }

    public static List<Query> loadDefault(CurriculumDataset dataset) throws IOException {
        return load(dataset);
    }

    public static List<Query> load(CurriculumDataset dataset) throws IOException {
        return load(dataset, "v1");
    }

    public static List<Query> load(CurriculumDataset dataset, String version) throws IOException {
        if (!List.of("v1", "v2").contains(version)) {
            throw new IllegalArgumentException("Holdout version must be v1 or v2");
        }
        var primary = dataset.chunks().stream().filter(c -> !c.control()).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Holdout dataset has no primary outcomes"));
        var root = CurriculumDataset.resourceRootFor(primary.subject(), primary.gradeLevel());
        var queries = CurriculumDataset.readLines(root, "holdout-" + version + ".jsonl", Query.class);
        validate(queries, dataset);
        if (queries.size() != 12 || queries.stream().filter(q -> q.kind() == Kind.POSITIVE).count() != 6
                || queries.stream().filter(q -> q.kind() == Kind.NEGATIVE).count() != 3
                || queries.stream().filter(q -> q.kind() == Kind.NEAR_MISS).count() != 3) {
            throw new IllegalStateException("Holdout " + version + " requires 6 positive, 3 negative and 3 near-miss cases");
        }
        return queries;
    }

    static void validate(List<Query> queries, CurriculumDataset dataset) {
        var primary = dataset.chunks().stream().filter(c -> !c.control()).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Holdout dataset has no primary outcomes"));
        Subject subject = primary.subject();
        GradeLevel gradeLevel = primary.gradeLevel();
        List<CurriculumChunk> chunks = dataset.chunks();
        Set<String> ids = new HashSet<>();
        Map<String, CurriculumChunk> byChunk = chunks.stream().collect(java.util.stream.Collectors.toMap(
                CurriculumChunk::chunkId, c -> c));
        for (var q : queries) {
            if (q == null || q.queryId() == null || q.queryId().isBlank() || !ids.add(q.queryId())
                    || q.kind() == null || q.topic() == null || q.topic().isBlank()
                    || q.goldRationale() == null || q.goldRationale().isBlank()
                    || !q.sourceSha256().equals(dataset.source().sourceSha256())
                    || !q.sourceDocument().equals(dataset.source().sourceDocument())
                    || q.sourceDocument() == null || q.sourceDocument().isBlank() || q.sourcePdfPage() < 1
                    || (q.kind() == Kind.POSITIVE) != !q.expectedChunkIds().isEmpty()) {
                throw new IllegalArgumentException("Invalid or duplicate source-frozen holdout query: "
                        + (q == null ? "null" : q.queryId()));
            }
            for (String id : q.expectedChunkIds()) {
                CurriculumChunk chunk = byChunk.get(id);
                if (chunk == null || chunk.control() || chunk.subject() != subject
                        || chunk.gradeLevel() != gradeLevel
                        || !chunk.sourceFragments().stream().anyMatch(f -> f.pdfPage() == q.sourcePdfPage())) {
                    throw new IllegalArgumentException("Holdout expected chunk/page does not resolve to source: " + id);
                }
            }
        }
    }

    public static List<Row> evaluate(CurriculumRAGService service, List<Query> queries) {
        return evaluate(service, queries, Subject.MATH, GradeLevel.GRADE_1);
    }

    public static List<Row> evaluate(CurriculumRAGService service, List<Query> queries,
                                     Subject subject, GradeLevel gradeLevel) {
        var rows = new ArrayList<Row>();
        for (var q : queries) {
            long start = System.nanoTime();
            var result = service.retrieve(q.topic(), subject, gradeLevel);
            rows.add(new Row(q, result.chunks(), result.candidates(), result.reasonCode(),
                    result.status() == CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE,
                    (int) result.chunks().stream().filter(c -> c.subject() != subject
                            || c.gradeLevel() != gradeLevel).count(), (System.nanoTime() - start) / 1_000_000,
                    result.evidenceSupports()));
        }
        return List.copyOf(rows);
    }

    public static Summary summarize(List<Row> rows) {
        int positives = (int) rows.stream().filter(r -> r.query().kind() == Kind.POSITIVE).count();
        int hits = (int) rows.stream().filter(Row::hit).count();
        int negatives = count(rows, Kind.NEGATIVE);
        int negativeRejections = (int) rows.stream().filter(r -> r.query().kind() == Kind.NEGATIVE && r.rejected()).count();
        int nearMisses = count(rows, Kind.NEAR_MISS);
        int nearMissRejections = (int) rows.stream().filter(r -> r.query().kind() == Kind.NEAR_MISS && r.rejected()).count();
        int falseRejections = positives - hits;
        int falseAcceptances = (int) rows.stream().filter(Row::falseAcceptance).count();
        int leaks = rows.stream().mapToInt(Row::leakedChunks).sum();
        boolean unique = rows.stream().map(r -> r.query().queryId()).distinct().count() == rows.size();
        boolean passed = unique && positives == 6 && hits >= 5 && negatives == 3 && negativeRejections == negatives
                && nearMisses == 3 && nearMissRejections == nearMisses && leaks == 0;
        return new Summary(rows.size(), positives, hits, fraction(hits, positives), negatives, negativeRejections,
                fraction(negativeRejections, negatives), nearMisses, nearMissRejections,
                fraction(nearMissRejections, nearMisses), falseRejections, fraction(falseRejections, positives),
                falseAcceptances, fraction(falseAcceptances, negatives + nearMisses), leaks, passed);
    }

    private static int count(List<Row> rows, Kind kind) {
        return (int) rows.stream().filter(r -> r.query().kind() == kind).count();
    }
    private static String fraction(int n, int d) { return n + "/" + d; }
}
