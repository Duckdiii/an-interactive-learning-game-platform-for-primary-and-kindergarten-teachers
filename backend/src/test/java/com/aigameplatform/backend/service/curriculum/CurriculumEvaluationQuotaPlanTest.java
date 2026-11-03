package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CurriculumEvaluationQuotaPlanTest {
    @Test void fullSixteenDatasetRunRequiresSeparateCurrentEmbeddingAndReviewerBudgets() {
        var estimate = CurriculumEvaluationQuotaPlan.estimate(480);
        assertThat(estimate.embeddingRequestsMax()).isEqualTo(480);
        assertThat(estimate.reviewerRequestsMax()).isEqualTo(480);
        assertThat(estimate.totalRequestsMax()).isEqualTo(960);

        var now = Instant.parse("2026-11-02T01:00:00Z");
        var sufficient = Map.of(
                CurriculumEvaluationQuotaPlan.EMBEDDING_BUDGET_KEY, "480",
                CurriculumEvaluationQuotaPlan.REVIEWER_BUDGET_KEY, "480",
                CurriculumEvaluationQuotaPlan.CHECKED_AT_KEY, now.toString());
        assertThat(CurriculumEvaluationQuotaPlan.check(sufficient, estimate, now).confirmed()).isTrue();

        var insufficient = Map.of(
                CurriculumEvaluationQuotaPlan.EMBEDDING_BUDGET_KEY, "479",
                CurriculumEvaluationQuotaPlan.REVIEWER_BUDGET_KEY, "480",
                CurriculumEvaluationQuotaPlan.CHECKED_AT_KEY, now.toString());
        assertThat(CurriculumEvaluationQuotaPlan.check(insufficient, estimate, now).confirmed()).isFalse();
    }

    @Test void missingStaleOrFutureQuotaCheckBlocksWithoutProviderCalls() {
        var estimate = CurriculumEvaluationQuotaPlan.estimate(1);
        var now = Instant.parse("2026-11-02T01:00:00Z");
        var enoughButStale = Map.of(
                CurriculumEvaluationQuotaPlan.EMBEDDING_BUDGET_KEY, "10",
                CurriculumEvaluationQuotaPlan.REVIEWER_BUDGET_KEY, "10",
                CurriculumEvaluationQuotaPlan.CHECKED_AT_KEY, "2026-11-02T00:00:00Z");
        var enoughButFuture = Map.of(
                CurriculumEvaluationQuotaPlan.EMBEDDING_BUDGET_KEY, "10",
                CurriculumEvaluationQuotaPlan.REVIEWER_BUDGET_KEY, "10",
                CurriculumEvaluationQuotaPlan.CHECKED_AT_KEY, "2026-11-02T01:01:00Z");

        assertThat(CurriculumEvaluationQuotaPlan.check(Map.of(), estimate, now).confirmed()).isFalse();
        assertThat(CurriculumEvaluationQuotaPlan.check(enoughButStale, estimate, now).confirmed()).isFalse();
        assertThat(CurriculumEvaluationQuotaPlan.check(enoughButFuture, estimate, now).confirmed()).isFalse();
    }
}
