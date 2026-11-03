package com.aigameplatform.backend.service.curriculum.review;

import java.util.List;
import java.util.Map;

public record CurriculumEvidenceReview(Status status, List<Map<String, Object>> claims,
                                       List<String> warnings, String reviewerModel) {
    public enum Status { PENDING, REVIEWED, UNAVAILABLE, STALE }
    public CurriculumEvidenceReview {
        if (status == null) throw new IllegalArgumentException("Review status required");
        claims = claims.stream().map(Map::copyOf).toList();
        warnings = List.copyOf(warnings);
    }
    public static CurriculumEvidenceReview unavailable() {
        return new CurriculumEvidenceReview(Status.UNAVAILABLE, List.of(), List.of("REVIEWER_NOT_CONFIGURED"), null);
    }
}
