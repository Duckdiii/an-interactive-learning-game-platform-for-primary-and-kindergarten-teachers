package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

class CurriculumConstraintsTest {
    @Test void constraintsChecksumIsStableAcrossWindowsLineEndings() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        byte[] source;
        try (var stream = CurriculumDataset.resource("constraints.jsonl")) { source = stream.readAllBytes(); }
        var text = new String(source, java.nio.charset.StandardCharsets.UTF_8).replace("\r\n", "\n");
        byte[] windowsBytes = text.replace("\n", "\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String canonicalSha = java.util.HexFormat.of().formatHex(
                java.security.MessageDigest.getInstance("SHA-256").digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        assertThat(CurriculumConstraints.parse(windowsBytes, canonicalSha, dataset).sha256()).isEqualTo(canonicalSha);
        var edited = text.replace("math-g1-001", "math-g1-001x");
        assertThat(edited).isNotEqualTo(text);
        assertThatThrownBy(() -> CurriculumConstraints.parse(
                edited.replace("\n", "\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8), canonicalSha, dataset))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("checksum mismatch");
    }

    @Test void checksumMissingDuplicateAndControlRowsAreRejected() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        byte[] original;
        try (var stream = CurriculumDataset.resource("constraints.jsonl")) { original = stream.readAllBytes(); }
        assertThatThrownBy(() -> CurriculumConstraints.parse(original, "0".repeat(64), dataset))
                .isInstanceOf(IllegalStateException.class);
        String text = new String(original, java.nio.charset.StandardCharsets.UTF_8);
        String first = text.lines().findFirst().orElseThrow();
        for (String invalid : java.util.List.of(text.substring(text.indexOf('\n') + 1), text + first + "\n",
                text.replace("math-g1-001", "control-math-g2-001"))) {
            byte[] bytes = invalid.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            String sha = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
            assertThatThrownBy(() -> CurriculumConstraints.parse(bytes, sha, dataset)).isInstanceOf(IllegalStateException.class);
        }
    }
    @Test void checkedSidecarRequiresAnExplicitApprovalOfItsExactBytes() throws Exception {
        var constraints = CurriculumConstraints.load(CurriculumDataset.loadDefault());
        assertThat(constraints.size()).isEqualTo(23);
        assertThatThrownBy(() -> constraints.requireApproved("" )).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> constraints.requireApproved("a".repeat(64))).isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> constraints.requireApproved(constraints.sha256())).doesNotThrowAnyException();
    }
}
