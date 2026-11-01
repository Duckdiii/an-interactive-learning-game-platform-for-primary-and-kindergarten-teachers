package com.aigameplatform.backend.service.curriculum;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.json.JsonMapper;

/** Append-only, local-only checkpoint for synthetic exploratory benchmark runs. */
final class CurriculumRuntimeCheckpoint implements AutoCloseable {
    private static final JsonMapper JSON = new JsonMapper();
    private static final Set<String> DECISIONS = Set.of("SUPPORTED", "INSUFFICIENT_EVIDENCE", "NEEDS_CLARIFICATION");

    private record Header(String recordType, String fingerprint) { }
    private record CheckpointRecord(String recordType, String fingerprint,
                                    CurriculumRuntimeEvaluation.Outcome outcome) { }

    private final Path path;
    private final String fingerprint;
    private final List<CurriculumRuntimeEvaluation.Outcome> history = new ArrayList<>();
    private final Map<String, CurriculumRuntimeEvaluation.Outcome> latest = new LinkedHashMap<>();

    private CurriculumRuntimeCheckpoint(Path path, String fingerprint) {
        this.path = path;
        this.fingerprint = fingerprint;
    }

    static CurriculumRuntimeCheckpoint open(Path path, String fingerprint) throws IOException {
        if (path == null || fingerprint == null || fingerprint.isBlank())
            throw new IllegalArgumentException("Checkpoint path and fingerprint are required");
        if (path.toAbsolutePath().getParent() != null) Files.createDirectories(path.toAbsolutePath().getParent());
        var checkpoint = new CurriculumRuntimeCheckpoint(path, fingerprint);
        if (!Files.exists(path)) {
            checkpoint.appendLine(JSON.writeValueAsString(new Header("header", fingerprint)));
            return checkpoint;
        }
        checkpoint.load();
        return checkpoint;
    }

    static CurriculumRuntimeCheckpoint openOrImport(Path path, String fingerprint, Path legacyReport,
            String datasetVersion, List<CurriculumBenchmark.Query> queries) throws IOException {
        if (legacyReport != null && Files.isRegularFile(legacyReport)) requireLegacyOutcomes(legacyReport);
        boolean existed = Files.exists(path);
        var checkpoint = open(path, fingerprint);
        if (!existed && legacyReport != null && Files.isRegularFile(legacyReport))
            checkpoint.importLegacy(legacyReport, datasetVersion, queries);
        return checkpoint;
    }

    private static void requireLegacyOutcomes(Path reportPath) throws IOException {
        var report = JSON.readTree(Files.readString(reportPath, StandardCharsets.UTF_8));
        if (!report.path("failureType").isTextual() || report.path("failureType").asString().isBlank()) return;
        boolean hasPerQueryOutcomes = false;
        var scopes = report.path("scopes");
        if (scopes.isObject()) for (var scope : scopes) {
            if (scope.path("outcomes").isArray()) { hasPerQueryOutcomes = true; break; }
        }
        if (!hasPerQueryOutcomes)
            throw new IllegalStateException("Previous report has no per-query outcomes; refusing to replay completed work. Restore its backup or choose an explicitly new run path.");
    }

    private void importLegacy(Path reportPath, String datasetVersion, List<CurriculumBenchmark.Query> queries)
            throws IOException {
        var report = JSON.readTree(Files.readString(reportPath, StandardCharsets.UTF_8));
        if (!"--exploratory".equals(report.path("mode").asString())
                || !"AI_AUTHORED_UNREVIEWED".equals(report.path("labelReview").asString()))
            throw new IllegalStateException("Legacy report is not the expected exploratory draft run");
        var oldOutcomes = report.path("scopes").path(datasetVersion).path("outcomes");
        if (!oldOutcomes.isArray()) return;
        var expected = new LinkedHashMap<String, CurriculumBenchmark.Query>();
        queries.forEach(query -> expected.put(query.queryId(), query));
        for (var node : oldOutcomes) {
            var old = JSON.treeToValue(node, CurriculumRuntimeEvaluation.Outcome.class);
            if (old.query() == null || !expected.containsKey(old.query().queryId())
                    || !JSON.writeValueAsString(expected.get(old.query().queryId()))
                            .equals(JSON.writeValueAsString(old.query())))
                throw new IllegalStateException("Legacy outcome query does not match the current frozen draft set");
            if (latest.containsKey(old.query().queryId())) continue;
            var imported = old.status().equals("SERVICE_UNAVAILABLE")
                    ? new CurriculumRuntimeEvaluation.Outcome(old.query(), old.status(), old.selectedIds(), old.ranked(),
                            old.elapsedMillis(), old.retrievalMillis(), old.verificationMillis(),
                            "CAUSE_NOT_CAPTURED_IN_PRIOR_RUN", old.ranked().isEmpty() ? "BEFORE_RANKING" : "AFTER_RANKING")
                    : old;
            record(imported);
        }
    }

    private void load() throws IOException {
        byte[] bytes = Files.readAllBytes(path);
        int validLength = bytes.length;
        if (validLength > 0 && bytes[validLength - 1] != '\n') {
            while (validLength > 0 && bytes[validLength - 1] != '\n') validLength--;
            if (validLength == 0) throw new IllegalStateException("Checkpoint has no complete header");
            try (var channel = FileChannel.open(path, StandardOpenOption.WRITE)) {
                channel.truncate(validLength);
                channel.force(true);
            }
        }
        var lines = new String(bytes, 0, validLength, StandardCharsets.UTF_8).lines().filter(line -> !line.isBlank()).toList();
        if (lines.isEmpty()) throw new IllegalStateException("Checkpoint is empty");
        var header = JSON.readValue(lines.getFirst(), Header.class);
        if (!"header".equals(header.recordType()) || !fingerprint.equals(header.fingerprint()))
            throw new IllegalStateException("Checkpoint fingerprint does not match current benchmark/model configuration");
        for (int i = 1; i < lines.size(); i++) {
            var record = JSON.readValue(lines.get(i), CheckpointRecord.class);
            if (!"outcome".equals(record.recordType()) || !fingerprint.equals(record.fingerprint())
                    || record.outcome() == null || record.outcome().query() == null)
                throw new IllegalStateException("Checkpoint contains an invalid outcome record");
            history.add(record.outcome());
            latest.put(record.outcome().query().queryId(), record.outcome());
        }
    }

    synchronized void record(CurriculumRuntimeEvaluation.Outcome outcome) throws IOException {
        if (outcome == null || outcome.query() == null) throw new IllegalArgumentException("Outcome is required");
        appendLine(JSON.writeValueAsString(new CheckpointRecord("outcome", fingerprint, outcome)));
        history.add(outcome);
        latest.put(outcome.query().queryId(), outcome);
    }

    Set<String> completedQueryIds() {
        var result = new LinkedHashSet<String>();
        latest.forEach((id, outcome) -> { if (DECISIONS.contains(outcome.status())) result.add(id); });
        return Set.copyOf(result);
    }

    List<String> pendingQueryIds(Collection<String> queryIds) {
        var complete = completedQueryIds();
        return queryIds.stream().filter(id -> !complete.contains(id)).toList();
    }

    List<CurriculumRuntimeEvaluation.Outcome> latestOutcomes() { return List.copyOf(latest.values()); }
    List<CurriculumRuntimeEvaluation.Outcome> history() { return List.copyOf(history); }

    private void appendLine(String line) throws IOException {
        byte[] bytes = (line + "\n").getBytes(StandardCharsets.UTF_8);
        try (var channel = FileChannel.open(path, StandardOpenOption.CREATE, StandardOpenOption.WRITE,
                StandardOpenOption.APPEND)) {
            var buffer = ByteBuffer.wrap(bytes);
            while (buffer.hasRemaining()) channel.write(buffer);
            channel.force(true);
        }
    }

    @Override public void close() { }
}
