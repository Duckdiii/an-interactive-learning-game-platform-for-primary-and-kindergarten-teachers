package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CurriculumEvaluationRunStoreTest {
    @TempDir Path tempDir;

    @Test void eachInvocationGetsAnIsolatedAttemptAndCannotReplaceAnOlderGlobalReport() throws Exception {
        var root = tempDir.resolve("runs");
        Files.createDirectories(root);
        var oldReport = root.resolve("live-dev.json");
        byte[] oldBytes = "historic-evidence".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        Files.write(oldReport, oldBytes);

        var first = CurriculumEvaluationRunStore.begin(root, null, Instant.parse("2026-11-02T00:00:00Z"));
        var second = CurriculumEvaluationRunStore.begin(root, null, Instant.parse("2026-11-02T00:00:00Z"));
        var resumed = CurriculumEvaluationRunStore.begin(root, first.runId(), Instant.parse("2026-11-02T00:01:00Z"));
        first.writeReport("{\"execution\":\"BLOCKED_ENVIRONMENT_OR_SERVICE\"}");

        assertThat(first.runId()).isNotEqualTo(second.runId());
        assertThat(first.runDirectory()).isNotEqualTo(second.runDirectory());
        assertThat(resumed.runDirectory()).isEqualTo(first.runDirectory());
        assertThat(resumed.attemptDirectory()).isNotEqualTo(first.attemptDirectory());
        assertThat(first.reportPath()).isNotEqualTo(resumed.reportPath());
        assertThat(first.reportPath()).isNotEqualTo(oldReport);
        assertThat(Files.readAllBytes(oldReport)).isEqualTo(oldBytes);
        assertThat(Files.readString(first.reportPath())).contains("BLOCKED_ENVIRONMENT_OR_SERVICE");
        try (var files = Files.list(first.attemptDirectory())) {
            assertThat(files).noneMatch(p -> p.getFileName().toString().endsWith(".tmp"));
        }
    }

    @Test void rejectsRunIdsThatCouldEscapeTheRunRoot() {
        assertThatThrownBy(() -> CurriculumEvaluationRunStore.begin(tempDir.resolve("runs"), "../outside",
                Instant.parse("2026-11-02T00:00:00Z")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("run ID");
    }
}
