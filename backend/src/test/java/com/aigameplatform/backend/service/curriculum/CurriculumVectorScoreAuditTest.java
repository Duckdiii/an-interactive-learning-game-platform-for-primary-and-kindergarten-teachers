package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumVectorScoreAuditTest {
    @Test
    void parsesPgvectorTextAndCalculatesCosineWithoutNormalizingTheInputs() {
        assertThat(CurriculumVectorScoreAudit.parsePgVector("[3, 4, 0]"))
                .containsExactly(3.0f, 4.0f, 0.0f);
        assertThat(CurriculumVectorScoreAudit.cosineSimilarity(List.of(1.0f, 0.0f), List.of(0.6f, 0.8f)))
                .isCloseTo(0.6, within(1.0e-7));
    }

    @Test
    void rejectsMalformedOrMismatchedVectorsInsteadOfLoggingAnUnverifiedComparison() {
        assertThatThrownBy(() -> CurriculumVectorScoreAudit.parsePgVector("[1, nope]"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CurriculumVectorScoreAudit.cosineSimilarity(List.of(1.0f), List.of(1.0f, 0.0f)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CurriculumVectorScoreAudit.cosineSimilarity(List.of(0.0f), List.of(0.0f)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void mapsCosineSimilarityToThePgvectorStoreRelevanceScale() {
        assertThat(CurriculumVectorScoreAudit.pgVectorRelevanceScore(0.7914593267100599))
                .isCloseTo(0.8957296633550299, within(1.0e-15));
        assertThat(CurriculumVectorScoreAudit.pgVectorRelevanceScore(0.7096493217459613))
                .isCloseTo(0.8548246608729806, within(1.0e-15));
        assertThatThrownBy(() -> CurriculumVectorScoreAudit.pgVectorRelevanceScore(Double.NaN))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
