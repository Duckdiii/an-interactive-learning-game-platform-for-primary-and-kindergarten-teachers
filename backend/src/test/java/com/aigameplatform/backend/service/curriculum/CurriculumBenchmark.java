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
                        GradeLevel gradeLevel, boolean expectedSupported, List<String> expectedChunkIds,
                        String writingStyle, String writerId, List<String> labelerIds, String split,
                        String ageBand) {
        public Query(String queryId, String groupId, String cohort, String topic, Subject subject,
                     GradeLevel gradeLevel, boolean expectedSupported, List<String> expectedChunkIds) {
            this(queryId, groupId, cohort, topic, subject, gradeLevel, expectedSupported, expectedChunkIds,
                    "LEGACY", "legacy", List.of("legacy"), "DEV", null);
        }
        public Query(String queryId, String groupId, String cohort, String topic, Subject subject,
                     GradeLevel gradeLevel, boolean expectedSupported, List<String> expectedChunkIds,
                     String writingStyle, String writerId, List<String> labelerIds, String split) {
            this(queryId, groupId, cohort, topic, subject, gradeLevel, expectedSupported, expectedChunkIds,
                    writingStyle, writerId, labelerIds, split, null);
        }
        public Query {
            if (queryId == null || queryId.isBlank() || groupId == null || groupId.isBlank()
                    || !Set.of("SUPPORTED", "BOUNDARY", "UNSUPPORTED").contains(cohort)
                    || topic == null || topic.isBlank() || subject == null || gradeLevel == null
                    || expectedChunkIds == null || expectedSupported == expectedChunkIds.isEmpty())
                throw new IllegalArgumentException("Invalid benchmark query");
            expectedChunkIds = List.copyOf(expectedChunkIds);
            writingStyle = writingStyle == null ? "" : writingStyle;
            writerId = writerId == null ? "" : writerId;
            labelerIds = labelerIds == null ? List.of() : List.copyOf(labelerIds);
            split = split == null ? "" : split;
        }
    }
    public record Row(Query query, boolean retrievalHit, boolean accepted, int leakedChunks,
                      long retrievalMillis, long verificationMillis, boolean evidenceCorrect,
                      boolean rescuedBySuggestion, double reciprocalRank) {
        public Row(Query query, boolean retrievalHit, boolean accepted, int leakedChunks,
                   long retrievalMillis, long verificationMillis) {
            this(query, retrievalHit, accepted, leakedChunks, retrievalMillis, verificationMillis,
                    false, false, 0.0);
        }
        public boolean falseReject() { return query.expectedSupported() && !accepted; }
        public boolean falseAccept() { return !query.expectedSupported() && accepted; }
    }
    public record Summary(int supportedQueries, int unsupportedQueries, double hitAt3, double supportedAcceptance,
                          int falseAcceptances, int leakedChunks, boolean qualityGatePassed,
                          int falseRejections, double falseRejectionRate, double falseAcceptanceRate,
                          double evidencePrecision, double suggestionRescueRate, double mrr,
                          long retrievalP50Millis, long retrievalP95Millis,
                          long retrievalAndVerificationP50Millis, long retrievalAndVerificationP95Millis, WilsonInterval falseRejectionInterval,
                          WilsonInterval falseAcceptanceInterval) { }
    public record WilsonInterval(double lower, double upper) { }
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
        String declaredSplit = manifest.path("split").asString();
        if (declaredSplit.isBlank() || queries.stream().anyMatch(q -> q.writingStyle().isBlank()
                || q.writerId().isBlank() || q.labelerIds().isEmpty() || q.labelerIds().contains(q.writerId())
                || !declaredSplit.equals(q.split())))
            throw new IllegalStateException("Every query needs a writing style, independent labeler and matching dev/test split");
        var primaryIds = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        if (queries.stream().anyMatch(q -> !primaryIds.containsAll(q.expectedChunkIds())))
            throw new IllegalArgumentException("Benchmark references an unknown or control outcome");
        return queries;
    }

    public static List<Query> loadReviewedKindergarten(Path path, CurriculumDataset dataset) throws IOException {
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
                || !"APPROVED".equals(manifest.path("reviewStatus").asString())
                || manifest.path("reviewedBy").asString().isBlank() || manifest.path("reviewedAt").asString().isBlank())
            throw new IllegalStateException("Preschool benchmark labels and source checksums need independent review");
        var queries = new String(bytes, StandardCharsets.UTF_8).lines().filter(s -> !s.isBlank())
                .map(s -> mapper.readValue(s, Query.class)).toList();
        if (queries.isEmpty() || queries.stream().map(Query::queryId).distinct().count() != queries.size())
            throw new IllegalArgumentException("Empty benchmark or duplicate query IDs");
        String declaredSplit = manifest.path("split").asString();
        var validOutcomes = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        if (declaredSplit.isBlank() || queries.stream().anyMatch(q -> q.gradeLevel() != GradeLevel.KINDERGARTEN
                || q.ageBand() == null || q.ageBand().isBlank()
                || q.writingStyle().isBlank() || q.writerId().isBlank() || q.labelerIds().isEmpty()
                || q.labelerIds().contains(q.writerId()) || !declaredSplit.equals(q.split())
                || !validOutcomes.containsAll(q.expectedChunkIds())
                || dataset.chunks().stream().filter(c -> q.expectedChunkIds().contains(c.chunkId()))
                        .anyMatch(c -> !q.ageBand().equals(c.ageBand()))))
            throw new IllegalStateException("Preschool benchmark needs independent labels, matching split, KG scope and non-control outcomes");
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
            if (!scope) { rows.add(new Row(query, false, false, 0, 0, 0, false, false, 0)); continue; }
            long started = System.nanoTime();
            var candidates = service.retrieve(query.topic(), query.subject(), query.gradeLevel());
            long retrieved = System.nanoTime();
            var decision = new CurriculumEvidenceVerifier().verify(new CurriculumTopicParser().parse(query.topic()), candidates.chunks(), constraints);
            long verified = System.nanoTime();
            int leaked = (int) candidates.chunks().stream().filter(c -> controls.contains(c.chunkId())
                    || c.subject() != query.subject() || c.gradeLevel() != query.gradeLevel()).count();
            boolean hit = candidates.chunks().stream().limit(3).anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
            boolean accepted = decision.status() == CurriculumEvidenceVerifier.Status.SUPPORTED;
            boolean evidenceCorrect = accepted && decision.supportedChunkIds().stream().anyMatch(query.expectedChunkIds()::contains);
            var rescueCandidates = candidates.chunks().isEmpty() ? candidates.suggestions() : candidates.chunks();
            boolean rescued = !accepted && query.expectedSupported() && rescueCandidates.stream().limit(3)
                    .anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
            double reciprocalRank = 0;
            for (int i = 0; i < candidates.chunks().size(); i++) {
                if (query.expectedChunkIds().contains(candidates.chunks().get(i).chunkId())) { reciprocalRank = 1.0 / (i + 1); break; }
            }
            rows.add(new Row(query, hit, accepted, leaked, (retrieved - started) / 1_000_000,
                    (verified - retrieved) / 1_000_000, evidenceCorrect, rescued, reciprocalRank));
        }
        return List.copyOf(rows);
    }

    public static List<Row> evaluateKindergarten(CurriculumRAGService service, CurriculumDataset dataset,
                                                 List<Query> queries, int topK, double minScore) {
        var rows = new ArrayList<Row>();
        var outcomes = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        for (var query : queries) {
            if (query.gradeLevel() != GradeLevel.KINDERGARTEN)
                throw new IllegalArgumentException("Kindergarten benchmark contains a non-KINDERGARTEN query");
            if (query.ageBand() == null || query.ageBand().isBlank())
                throw new IllegalArgumentException("Kindergarten benchmark query must declare its age band");
            long started = System.nanoTime();
            var ageBand = com.aigameplatform.backend.entity.enums.KindergartenAgeBand.valueOf(query.ageBand());
            var result = service.retrieveKindergarten(query.topic(), query.subject(), dataset.source(), ageBand, topK, minScore);
            long finished = System.nanoTime();
            int leaked = (int) result.chunks().stream().filter(c -> c.gradeLevel() != GradeLevel.KINDERGARTEN
                    || c.domain() == null || !Set.of("COGNITIVE", "LANGUAGE").contains(c.domain())
                    || !outcomes.contains(c.chunkId()) || !query.ageBand().equals(c.ageBand())).count();
            boolean accepted = result.status() == CurriculumRAGService.Status.FOUND;
            boolean evidenceCorrect = accepted && result.chunks().stream().anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
            var suggestions = result.chunks().isEmpty() ? result.suggestions() : result.chunks();
            boolean rescued = !accepted && query.expectedSupported() && suggestions.stream().limit(3)
                    .anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
            double reciprocalRank = 0;
            var ranked = accepted ? result.chunks() : result.suggestions();
            for (int i = 0; i < ranked.size(); i++) {
                if (query.expectedChunkIds().contains(ranked.get(i).chunkId())) { reciprocalRank = 1.0 / (i + 1); break; }
            }
            boolean hit = ranked.stream().limit(3).anyMatch(c -> query.expectedChunkIds().contains(c.chunkId()));
            rows.add(new Row(query, hit, accepted, leaked, (finished - started) / 1_000_000, 0,
                    evidenceCorrect, rescued, reciprocalRank));
        }
        return List.copyOf(rows);
    }

    public static Summary summarize(List<Row> rows) {
        int positive = (int) rows.stream().filter(r -> r.query().expectedSupported()).count();
        int negative = rows.size() - positive;
        double hit = positive == 0 ? 0 : (double) rows.stream().filter(r -> r.query().expectedSupported() && r.retrievalHit()).count() / positive;
        double accepted = positive == 0 ? 0 : (double) rows.stream().filter(r -> r.query().expectedSupported() && r.accepted()).count() / positive;
        int falseAccepted = (int) rows.stream().filter(r -> !r.query().expectedSupported() && r.accepted()).count();
        int falseRejected = (int) rows.stream().filter(Row::falseReject).count();
        int acceptedPositive = (int) rows.stream().filter(r -> r.query().expectedSupported() && r.accepted()).count();
        int rescuedDenominator = (int) rows.stream().filter(r -> r.query().expectedSupported() && !r.accepted()).count();
        int leaked = rows.stream().mapToInt(Row::leakedChunks).sum();
        boolean unique = rows.stream().map(r -> r.query().queryId()).distinct().count() == rows.size();
        return new Summary(positive, negative, hit, accepted, falseAccepted, leaked,
                unique && positive > 0 && negative > 0 && hit >= 0.9 && accepted >= 0.9 && falseAccepted == 0 && leaked == 0,
                falseRejected, positive == 0 ? 0 : (double) falseRejected / positive,
                negative == 0 ? 0 : (double) falseAccepted / negative,
                acceptedPositive == 0 ? 0 : (double) rows.stream().filter(r -> r.query().expectedSupported() && r.accepted() && r.evidenceCorrect()).count() / acceptedPositive,
                rescuedDenominator == 0 ? 0 : (double) rows.stream().filter(r -> r.falseReject() && r.rescuedBySuggestion()).count() / rescuedDenominator,
                positive == 0 ? 0 : rows.stream().filter(r -> r.query().expectedSupported()).mapToDouble(Row::reciprocalRank).average().orElse(0),
                percentile(rows.stream().map(Row::retrievalMillis).sorted().toList(), 0.50),
                percentile(rows.stream().map(Row::retrievalMillis).sorted().toList(), 0.95),
                percentile(rows.stream().map(r -> r.retrievalMillis() + r.verificationMillis()).sorted().toList(), 0.50),
                percentile(rows.stream().map(r -> r.retrievalMillis() + r.verificationMillis()).sorted().toList(), 0.95),
                wilson(falseRejected, positive), wilson(falseAccepted, negative));
    }

    private static long percentile(List<Long> sorted, double quantile) {
        if (sorted.isEmpty()) return 0;
        return sorted.get(Math.max(0, (int) Math.ceil(quantile * sorted.size()) - 1));
    }

    private static WilsonInterval wilson(int failures, int trials) {
        if (trials == 0) return new WilsonInterval(0, 1);
        double z = 1.959963984540054, p = (double) failures / trials, z2 = z * z;
        double center = (p + z2 / (2 * trials)) / (1 + z2 / trials);
        double margin = z * Math.sqrt(p * (1 - p) / trials + z2 / (4.0 * trials * trials)) / (1 + z2 / trials);
        return new WilsonInterval(Math.max(0, center - margin), Math.min(1, center + margin));
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

    public static Map<String, Summary> summarizeByScopeAndStyle(List<Row> rows) {
        var groups = new TreeMap<String, List<Row>>();
        for (var row : rows) {
            String key = row.query().subject() + "/" + row.query().gradeLevel() + "/" + row.query().writingStyle();
            groups.computeIfAbsent(key, ignored -> new ArrayList<>()).add(row);
        }
        var summaries = new LinkedHashMap<String, Summary>();
        groups.forEach((key, group) -> summaries.put(key, summarize(group)));
        return Collections.unmodifiableMap(summaries);
    }
}
