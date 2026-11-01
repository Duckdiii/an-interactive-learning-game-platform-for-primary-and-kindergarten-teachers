package com.aigameplatform.backend.service.curriculum;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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
            checkpoint.writeSnapshot(List.of());
            return checkpoint;
        }
        checkpoint.load();
        return checkpoint;
    }

    private void load() throws IOException {
        byte[] bytes = Files.readAllBytes(path);
        int validLength = bytes.length;
        if (validLength > 0 && bytes[validLength - 1] != '\n') {
            while (validLength > 0 && bytes[validLength - 1] != '\n') validLength--;
            if (validLength == 0) throw new IllegalStateException("Checkpoint has no complete header");
            throw new IllegalStateException("Checkpoint is not newline-terminated; preserve it and start a separate run");
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
        var nextHistory = new ArrayList<>(history);
        nextHistory.add(outcome);
        writeSnapshot(nextHistory);
        history.add(outcome);
        latest.put(outcome.query().queryId(), outcome);
    }

    private void writeSnapshot(List<CurriculumRuntimeEvaluation.Outcome> outcomes) throws IOException {
        var lines = new StringBuilder(JSON.writeValueAsString(new Header("header", fingerprint))).append('\n');
        for (var outcome : outcomes)
            lines.append(JSON.writeValueAsString(new CheckpointRecord("outcome", fingerprint, outcome))).append('\n');
        CurriculumEvaluationRunStore.writeAtomically(path, lines.toString());
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

    @Override public void close() { }
}
