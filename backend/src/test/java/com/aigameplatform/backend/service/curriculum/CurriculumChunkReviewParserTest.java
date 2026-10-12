package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import org.junit.jupiter.api.Test;

class CurriculumChunkReviewParserTest {
    private final CurriculumChunkReviewParser parser = new CurriculumChunkReviewParser();

    @Test
    void acceptsExactlyOneReviewForEveryExpectedChunk() {
        String json = """
                {"reviews":[{"chunkId":"math-g1-001","atomicity":"PASS","scopeFit":"PASS",
                "limits":"NEEDS_HUMAN_REVIEW","note":"Check retained limits","disposition":"NEEDS_HUMAN_REVIEW"}]}
                """;

        var parsed = parser.parse(json, Set.of("math-g1-001"));

        assertThat(parsed).singleElement().satisfies(review -> {
            assertThat(review.chunkId()).isEqualTo("math-g1-001");
            assertThat(review.disposition()).isEqualTo("NEEDS_HUMAN_REVIEW");
        });
    }

    @Test
    void rejectsMissingDuplicateUnexpectedAndInvalidReviews() {
        assertThatThrownBy(() -> parser.parse("{\"reviews\":[]}", Set.of("expected")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parser.parse("""
                {"reviews":[{"chunkId":"expected","atomicity":"PASS","scopeFit":"PASS","limits":"PASS","note":"ok","disposition":"CANDIDATE_OK"},
                {"chunkId":"expected","atomicity":"PASS","scopeFit":"PASS","limits":"PASS","note":"ok","disposition":"CANDIDATE_OK"}]}
                """, Set.of("expected"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parser.parse("""
                {"reviews":[{"chunkId":"other","atomicity":"PASS","scopeFit":"PASS","limits":"PASS","note":"ok","disposition":"CANDIDATE_OK"}]}
                """, Set.of("expected"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parser.parse("""
                {"reviews":[{"chunkId":"expected","atomicity":"MAYBE","scopeFit":"PASS","limits":"PASS","note":"ok","disposition":"CANDIDATE_OK"}]}
                """, Set.of("expected"))).isInstanceOf(IllegalArgumentException.class);
    }
}
