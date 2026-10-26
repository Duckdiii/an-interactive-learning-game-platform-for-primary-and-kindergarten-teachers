package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CurriculumIngestSourceTest {
    @TempDir Path directory;

    @Test
    void rejectsAMissingPdfBeforeDemandingCredentialsOrConnectingToTheDatabase() {
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--ingest", directory.resolve("missing.pdf").toString()}, Map.of()))
                .isInstanceOf(java.nio.file.NoSuchFileException.class);
    }

    @Test
    void rejectsADifferentPdfBeforeDemandingCredentialsOrConnectingToTheDatabase() throws Exception {
        Path wrongSource = Files.writeString(directory.resolve("wrong.pdf"), "Not the official source");
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--ingest", wrongSource.toString()}, Map.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("SHA-256");
    }
}
