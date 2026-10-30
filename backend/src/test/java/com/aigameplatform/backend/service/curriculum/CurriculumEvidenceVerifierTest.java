package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class CurriculumEvidenceVerifierTest {
    private CurriculumEvidenceVerifier.VerificationDecision verify(String topic, String... ids) throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var candidates = dataset.chunks().stream().filter(c -> List.of(ids).contains(c.chunkId()))
                .map(c -> new CurriculumRAGService.RetrievedChunk(c.chunkId(), c.subject(), c.gradeLevel(), c.topic(),
                        c.text(), 0.99, dataset.source().sourceDocument(), List.of(187), List.of(21), dataset.source().curriculumVersion())).toList();
        return new CurriculumEvidenceVerifier().verify(new CurriculumTopicParser().parse(topic), candidates,
                CurriculumConstraints.load(dataset));
    }

    @Test void rangeContainmentAndSkillSpecificEvidence() throws Exception {
        assertThat(verify("Đếm số con vật từ 1 đến 5", "math-g1-001").status().name()).isEqualTo("SUPPORTED");
        assertThat(verify("Cộng trong phạm vi 1000", "math-g1-005").status().name()).isEqualTo("UNSUPPORTED");
        assertThat(verify("Cộng có nhớ trong phạm vi 100", "math-g1-005").status().name()).isEqualTo("UNSUPPORTED");
        assertThat(verify("Cộng trong phạm vi 100", "math-g1-001").status().name()).isEqualTo("UNSUPPORTED");
        assertThat(verify("Cộng trong phạm vi 100", "math-g1-004").status().name()).isEqualTo("UNSUPPORTED");
    }

    @Test void unknownNegatedAndUnsupportedClausesFailClosed() throws Exception {
        for (String topic : List.of("Đem số con vật từ 1 đến 5", "Đếm và lập trình Python", "Không đếm số",
                "Cộng số âm", "Cộng 1.5", "Cộng trong phạm vi 100 rồi nhân", "Đếm theo cấp số nhân",
                "Đếm và chia đều", "Cộng trong phạm vi 10 hoặc 1000")) {
            assertThat(verify(topic, "math-g1-001", "math-g1-005").status().name())
                    .as(topic).isNotEqualTo("SUPPORTED");
        }
    }

    @Test void multipleClausesCannotBorrowAnUnrelatedRange() throws Exception {
        assertThat(verify("Đếm trong phạm vi 100 và cộng trong phạm vi 1000", "math-g1-001", "math-g1-005")
                .status().name()).isEqualTo("UNSUPPORTED");
        assertThat(verify("Cộng không nhớ trong phạm vi 100", "math-g1-005").supportedChunkIds()).containsExactly("math-g1-005");
        assertThat(verify("Đo độ dài bằng cm", "math-g1-020").status().name()).isEqualTo("SUPPORTED");
        assertThat(verify("Đo độ dài bằng mét", "math-g1-020").status().name()).isNotEqualTo("SUPPORTED");
    }

    @Test void missingCriticalBoundsAndCarryConditionsNeedClarification() throws Exception {
        assertThat(verify("Đếm con vật", "math-g1-001").status().name()).isEqualTo("NEEDS_CLARIFICATION");
        assertThat(verify("Cộng", "math-g1-005", "math-g1-006").status().name()).isEqualTo("NEEDS_CLARIFICATION");
        assertThat(verify("Cộng trong phạm vi 100", "math-g1-005").status().name()).isEqualTo("NEEDS_CLARIFICATION");
        assertThat(verify("Đo độ dài bằng cm", "math-g1-023").status().name()).isNotEqualTo("SUPPORTED");
        assertThat(verify("Đo độ dài", "math-g1-020").status().name()).isEqualTo("NEEDS_CLARIFICATION");
        assertThat(verify("Đọc giờ", "math-g1-021").status().name()).isNotEqualTo("SUPPORTED");
        assertThat(verify("Xem đồng hồ", "math-g1-018").status().name()).isNotEqualTo("SUPPORTED");
        assertThat(verify("Đọc giờ đúng", "math-g1-021").status().name()).isEqualTo("SUPPORTED");
    }
}
