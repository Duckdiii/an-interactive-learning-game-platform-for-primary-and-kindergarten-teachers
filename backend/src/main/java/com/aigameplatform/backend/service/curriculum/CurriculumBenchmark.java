package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.*;
import java.io.IOException;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;

/** Evaluation of curated test questions, not production teacher requests. Legacy spike stays separate. */
public final class CurriculumBenchmark {
    private CurriculumBenchmark() { }
    public record Query(String queryId, String groupId, String cohort, String topic, Subject subject,
                        GradeLevel gradeLevel, boolean expectedSupported, List<String> expectedChunkIds) {
        public Query {
            if (queryId == null || queryId.isBlank() || groupId == null || groupId.isBlank()
                    || !Set.of("SUPPORTED", "BOUNDARY", "UNSUPPORTED").contains(cohort)
                    || topic == null || topic.isBlank() || subject == null || gradeLevel == null
                    || expectedChunkIds == null || expectedSupported == expectedChunkIds.isEmpty())
                throw new IllegalArgumentException("Invalid benchmark query");
            expectedChunkIds = List.copyOf(expectedChunkIds);
        }
    }
    public record Row(Query query, boolean retrievalHit, boolean accepted, int leakedChunks,
                      long retrievalMillis, long verificationMillis) { }
    public record Summary(int supportedQueries, int unsupportedQueries, double hitAt3, double supportedAcceptance,
                          int falseAcceptances, int leakedChunks, boolean qualityGatePassed) { }
    public record CohortSummary(int supportedQueries, int unsupportedQueries, double hitAt3, double supportedAcceptance,
                                int falseAcceptances, int leakedChunks) { }

    public static List<Query> loadReviewed(Path path, CurriculumDataset dataset, CurriculumConstraints constraints) throws IOException {
        var mapper = new JsonMapper();
        byte[] bytes = Files.readAllBytes(path);
        var manifest = mapper.readTree(Files.readString(Path.of(path + ".manifest.json"), StandardCharsets.UTF_8));
        String sha;
        try { sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
        if (!sha.equals(manifest.path("querySha256").asString())
                || !dataset.source().datasetVersion().equals(manifest.path("datasetVersion").asString())
                || !dataset.source().curriculumVersion().equals(manifest.path("curriculumVersion").asString())
                || !dataset.source().sourceSha256().equals(manifest.path("sourceSha256").asString())
                || !constraints.sha256().equals(manifest.path("constraintsSha256").asString())
                || !"APPROVED".equals(manifest.path("reviewStatus").asString())
                || manifest.path("reviewedBy").asString().isBlank() || manifest.path("reviewedAt").asString().isBlank())
            throw new IllegalStateException("Benchmark labels/source/checksums must be independently reviewed");
        var queries = new String(bytes, StandardCharsets.UTF_8).lines().filter(s -> !s.isBlank())
                .map(s -> mapper.readValue(s, Query.class)).toList();
        if (queries.isEmpty() || queries.stream().map(Query::queryId).distinct().count() != queries.size())
            throw new IllegalArgumentException("Empty benchmark or duplicate query IDs");
        var primaryIds = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        if (queries.stream().anyMatch(q -> !primaryIds.containsAll(q.expectedChunkIds())))
            throw new IllegalArgumentException("Benchmark references an unknown or control outcome");
        return queries;
    }

    public static void requireDisjoint(List<Query> tune, List<Query> holdout) {
        var groups = tune.stream().map(Query::groupId).collect(java.util.stream.Collectors.toSet());
        var topics = tune.stream().map(q -> CurriculumChunk.normalize(q.topic()).toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        if (holdout.stream().anyMatch(q -> groups.contains(q.groupId())
                || topics.contains(CurriculumChunk.normalize(q.topic()).toLowerCase(Locale.ROOT))))
            throw new IllegalArgumentException("Tune/holdout overlap by intent group or normalized topic");
    }

    public static void requireCohorts(List<Query> queries, String set) {
        int n = "holdout".equals(set) ? 20 : 10;
        if (queries.size() != 3 * n || queries.stream().filter(q -> q.cohort().equals("SUPPORTED") && q.expectedSupported()).count() != n
                || queries.stream().filter(q -> q.cohort().equals("UNSUPPORTED") && !q.expectedSupported()).count() != n
                || queries.stream().filter(q -> q.cohort().equals("BOUNDARY") && q.expectedSupported()).count() != n / 2
                || queries.stream().filter(q -> q.cohort().equals("BOUNDARY") && !q.expectedSupported()).count() != n / 2)
            throw new IllegalArgumentException("Benchmark cohort counts differ from the approved design");
    }

    public static List<Row> evaluate(CurriculumRAGService service, CurriculumDataset dataset,
                                     CurriculumConstraints constraints, List<Query> queries) {
        var rows = new ArrayList<Row>();
        var controls = dataset.chunks().stream().filter(CurriculumChunk::control).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        for (var query : queries) {
            boolean scope = dataset.chunks().stream().anyMatch(c -> !c.control() && c.subject() == query.subject() && c.gradeLevel() == query.gradeLevel());
            if (!scope) { rows.add(new Row(query, false, false, 0, 0, 0)); continue; }
            long started = System.nanoTime();
            var candidates = service.retrieve(query.topic(), query.subject(), query.gradeLevel());
            long retrieved = System.nanoTime();
            var decision = new CurriculumEvidenceVerifier().verify(new CurriculumTopicParser().parse(query.topic()), candidates.chunks(), constraints);
            long verified = System.nanoTime();
            int leaked = (int) candidates.chunks().stream().filter(c -> controls.contains(c.chunkId())
                    || c.subject() != query.subject() || c.gradeLevel() != query.gradeLevel()).count();
            boolean hit = candidates.chunks().stream().limit(3).anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
            rows.add(new Row(query, hit, decision.status() == CurriculumEvidenceVerifier.Status.SUPPORTED, leaked,
                    (retrieved - started) / 1_000_000, (verified - retrieved) / 1_000_000));
        }
        return List.copyOf(rows);
    }

    public static Summary summarize(List<Row> rows) {
        int positive = (int) rows.stream().filter(r -> r.query().expectedSupported()).count();
        int negative = rows.size() - positive;
        double hit = positive == 0 ? 0 : (double) rows.stream().filter(r -> r.query().expectedSupported() && r.retrievalHit()).count() / positive;
        double accepted = positive == 0 ? 0 : (double) rows.stream().filter(r -> r.query().expectedSupported() && r.accepted()).count() / positive;
        int falseAccepted = (int) rows.stream().filter(r -> !r.query().expectedSupported() && r.accepted()).count();
        int leaked = rows.stream().mapToInt(Row::leakedChunks).sum();
        boolean unique = rows.stream().map(r -> r.query().queryId()).distinct().count() == rows.size();
        return new Summary(positive, negative, hit, accepted, falseAccepted, leaked,
                unique && positive > 0 && negative > 0 && hit >= 0.9 && accepted >= 0.9 && falseAccepted == 0 && leaked == 0);
    }

    public static Map<String, CohortSummary> summarizeCohorts(List<Row> rows) {
        var summaries = new LinkedHashMap<String, CohortSummary>();
        for (String cohort : List.of("SUPPORTED", "BOUNDARY", "UNSUPPORTED")) {
            var summary = summarize(rows.stream().filter(r -> r.query().cohort().equals(cohort)).toList());
            summaries.put(cohort, new CohortSummary(summary.supportedQueries(), summary.unsupportedQueries(), summary.hitAt3(),
                    summary.supportedAcceptance(), summary.falseAcceptances(), summary.leakedChunks()));
        }
        return Collections.unmodifiableMap(summaries);
    }
}
