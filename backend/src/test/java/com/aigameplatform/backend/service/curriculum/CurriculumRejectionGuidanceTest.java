package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumRejectionGuidanceTest {
    @Test void messagesSuggestOnlyPublishedTopicsAndDoNotEchoTeacherInput() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var guidance = new CurriculumRejectionGuidance();
        var clarify = new CurriculumEvidenceVerifier.VerificationDecision(CurriculumEvidenceVerifier.Status.NEEDS_CLARIFICATION,
                "CLARIFY_CONSTRAINTS", List.of());
        String message = guidance.message(clarify, dataset);
        assertThat(message).contains("làm rõ", "Số tự nhiên").doesNotContain("1000", "control-", "SECRET_TOPIC");
    }
}
