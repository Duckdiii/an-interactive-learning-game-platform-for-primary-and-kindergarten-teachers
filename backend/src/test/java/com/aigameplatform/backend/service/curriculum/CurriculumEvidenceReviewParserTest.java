package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import org.junit.jupiter.api.Test;

class CurriculumEvidenceReviewParserTest {
    @Test
    void acceptsOnlyKnownEvidenceIdsAndPreservesWarningsForEveryQuestion() {
        String json = """
                {"claims":[{"questionId":"q1","claim":"5 + 3 = 8","status":"SUPPORTED","reason":"Matches outcome","chunkIds":["math-g1-007"]},
                {"questionId":"q2","claim":"Adds within 100 with carrying","status":"UNSUPPORTED","reason":"Outside cited range","chunkIds":["math-g1-007"]}]}
                """;
        var review = CurriculumEvidenceReviewParser.parse(json, Set.of("math-g1-007"), Set.of("q1", "q2"));
        assertThat(review.status()).isEqualTo(CurriculumEvidenceReview.Status.REVIEWED);
        assertThat(review.claims()).hasSize(2);
        assertThat(review.warnings()).hasSize(1);
        assertThat(review.warnings().getFirst().chunkIds()).containsExactly("math-g1-007");
    }

    @Test
    void rejectsCitationsOutsideRetrievedEvidence() {
        String json = "{\"claims\":[{\"questionId\":\"q1\",\"claim\":\"x\",\"status\":\"SUPPORTED\",\"reason\":\"ok\",\"chunkIds\":[\"made-up\"]}]}";
        assertThatThrownBy(() -> CurriculumEvidenceReviewParser.parse(json, Set.of("math-g1-007"), Set.of("q1")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsMissingOrUnknownStatuses() {
        String json = "{\"claims\":[{\"questionId\":\"q1\",\"claim\":\"x\",\"status\":\"PASS\",\"reason\":\"ok\",\"chunkIds\":[]}]}";
        assertThatThrownBy(() -> CurriculumEvidenceReviewParser.parse(json, Set.of(), Set.of("q1")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsReviewThatOmitsAQuestion() {
        String json = "{\"claims\":[{\"questionId\":\"q1\",\"claim\":\"x\",\"status\":\"SUPPORTED\",\"reason\":\"ok\",\"chunkIds\":[\"math-g1-007\"]}]}";
        assertThatThrownBy(() -> CurriculumEvidenceReviewParser.parse(json, Set.of("math-g1-007"), Set.of("q1", "q2")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("every game question");
    }

    @Test
    void rejectsClaimForUnknownQuestion() {
        String json = "{\"claims\":[{\"questionId\":\"q3\",\"claim\":\"x\",\"status\":\"SUPPORTED\",\"reason\":\"ok\",\"chunkIds\":[\"math-g1-007\"]}]}";
        assertThatThrownBy(() -> CurriculumEvidenceReviewParser.parse(json, Set.of("math-g1-007"), Set.of("q1")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unknown game question");
    }
}
