package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class CurriculumEvidenceVerifierTest {
    @Test void ambiguousArithmeticIntervalNeedsClarificationInsteadOfDroppingItsLowerBound() throws Exception {
        var parsed = new CurriculumTopicParser().parse("Cộng từ 5 đến 10");
        assertThat(parsed.requirements().getFirst().minNumber()).isEqualTo(5L);
        assertThat(parsed.requirements().getFirst().maxNumber()).isEqualTo(10L);
        assertThat(parsed.hasAmbiguousArithmeticInterval()).isTrue();
        assertThat(parsed.supportsPilotArithmetic()).isFalse();
        assertThat(verify("Cộng từ 5 đến 10", "math-g1-007").status())
                .isEqualTo(CurriculumEvidenceVerifier.Status.NEEDS_CLARIFICATION);
        assertThat(verify("Cộng trong phạm vi 10", "math-g1-007").status())
                .isEqualTo(CurriculumEvidenceVerifier.Status.SUPPORTED);
    }

    @Test void explicitIntervalApplicationsRetainBothBoundsForSemanticVerification() {
        var parser = new CurriculumTopicParser();
        for (var entry : Map.of("Cộng các toán hạng từ 5 đến 10", CurriculumTopicParser.RangeApplication.OPERANDS,
                "Cộng có kết quả từ 5 đến 10", CurriculumTopicParser.RangeApplication.RESULT).entrySet()) {
            var parsed = parser.parse(entry.getKey());
            var requirement = parsed.requirements().stream().filter(r -> r.skill() == CurriculumConstraints.Skill.ADD)
                    .findFirst().orElseThrow();
            assertThat(requirement.minNumber()).isEqualTo(5L);
            assertThat(requirement.maxNumber()).isEqualTo(10L);
            assertThat(requirement.rangeApplication()).isEqualTo(entry.getValue());
            assertThat(parsed.hasAmbiguousArithmeticInterval()).isFalse();
            assertThat(parsed.supportsPilotArithmetic()).isFalse();
        }
        assertThat(parser.parse("Cộng trong phạm vi 10").supportsPilotArithmetic()).isTrue();
    }

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
