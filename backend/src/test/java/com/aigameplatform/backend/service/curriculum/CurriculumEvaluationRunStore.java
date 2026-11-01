package com.aigameplatform.backend.service.curriculum;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import tools.jackson.databind.json.JsonMapper;

/** Run-scoped storage for local synthetic curriculum evaluation; each invocation has its own attempt report. */
final class CurriculumEvaluationRunStore {
    private static final JsonMapper JSON = new JsonMapper();
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmssSSS'Z'")
            .withZone(ZoneOffset.UTC);
    private record RunManifest(String runId, Instant createdAt) { }

    record Run(String runId, String attemptId, Path runDirectory, Path attemptDirectory, Path reportPath) {
        void writeReport(String json) throws IOException {
            writeAtomically(reportPath, json);
        }
    }

    private CurriculumEvaluationRunStore() { }

    static Run begin(Path root, String requestedRunId, Instant now) throws IOException {
        if (root == null || now == null) throw new IllegalArgumentException("Run root and timestamp are required");
        String runId = requestedRunId == null || requestedRunId.isBlank()
                ? "run-" + STAMP.format(now) + "-" + UUID.randomUUID().toString().substring(0, 8)
                : requestedRunId;
        if (!runId.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,79}"))
            throw new IllegalArgumentException("Invalid evaluation run ID");

        Path normalizedRoot = root.toAbsolutePath().normalize();
        Files.createDirectories(normalizedRoot);
        Path runDirectory = normalizedRoot.resolve(runId).normalize();
        if (!runDirectory.startsWith(normalizedRoot)) throw new IllegalArgumentException("Evaluation run ID escapes run root");
        boolean created = false;
        try {
            Files.createDirectory(runDirectory);
            created = true;
        } catch (java.nio.file.FileAlreadyExistsException exists) {
            if (!Files.isDirectory(runDirectory)) throw new IOException("Run path exists and is not a directory");
        }
        Path manifestPath = runDirectory.resolve("run-manifest.json");
        if (created) writeAtomically(manifestPath, JSON.writeValueAsString(new RunManifest(runId, now)));
        else {
            if (!Files.isRegularFile(manifestPath))
                throw new IOException("Existing run directory has no manifest; refusing to adopt it");
            var manifest = JSON.readValue(Files.readString(manifestPath, StandardCharsets.UTF_8), RunManifest.class);
            if (!runId.equals(manifest.runId())) throw new IOException("Run manifest ID mismatch");
        }

        Path attempts = runDirectory.resolve("attempts");
        Files.createDirectories(attempts);
        String attemptId;
        Path attemptDirectory;
        do {
            attemptId = "attempt-" + STAMP.format(now) + "-" + UUID.randomUUID().toString().substring(0, 8);
            attemptDirectory = attempts.resolve(attemptId);
        } while (!createUniqueDirectory(attemptDirectory));
        return new Run(runId, attemptId, runDirectory, attemptDirectory, attemptDirectory.resolve("report.json"));
    }

    private static boolean createUniqueDirectory(Path path) throws IOException {
        try { Files.createDirectory(path); return true; }
        catch (java.nio.file.FileAlreadyExistsException exists) { return false; }
    }

    static void writeAtomically(Path target, String content) throws IOException {
        Path absolute = target.toAbsolutePath().normalize();
        Path parent = absolute.getParent();
        if (parent == null) throw new IOException("Atomic output path has no parent");
        Files.createDirectories(parent);
        Path temporary = parent.resolve("." + absolute.getFileName() + "." + UUID.randomUUID() + ".tmp");
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        try {
            try (var channel = FileChannel.open(temporary, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                var buffer = ByteBuffer.wrap(bytes);
                while (buffer.hasRemaining()) channel.write(buffer);
                channel.force(true);
            }
            try {
                Files.move(temporary, absolute, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException unsupported) {
                throw new IOException("Filesystem does not support atomic evaluation output replacement", unsupported);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }
}
