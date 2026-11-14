package com.aigameplatform.backend.service.curriculum.review;

import com.aigameplatform.backend.entity.enums.CurriculumReviewStatus;
import java.util.List;
import java.util.Map;

public record CurriculumEvidenceReview(CurriculumReviewStatus status, List<Map<String, Object>> claims,
                                       List<String> warnings, String reviewerModel) {
    public CurriculumEvidenceReview {
        if (status == null) throw new IllegalArgumentException("Review status required");
        claims = claims.stream().map(Map::copyOf).toList();
        warnings = List.copyOf(warnings);
    }
    public static CurriculumEvidenceReview unavailable() {
        return new CurriculumEvidenceReview(CurriculumReviewStatus.UNAVAILABLE, List.of(), List.of("REVIEWER_NOT_CONFIGURED"), null);
    }
}
