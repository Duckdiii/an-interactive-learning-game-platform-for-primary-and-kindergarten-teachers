package com.aigameplatform.backend.service.curriculum;

import java.util.List;

/** Advisory-only review of generated educational claims against retrieved curriculum evidence. */
public record CurriculumEvidenceReview(Status status, List<Claim> claims, List<Warning> warnings) {
    public CurriculumEvidenceReview {
        if (status == null || claims == null || warnings == null) {
            throw new IllegalArgumentException("Review status, claims and warnings are required");
        }
        claims = List.copyOf(claims);
        warnings = List.copyOf(warnings);
    }

    public enum Status { REVIEWED, UNAVAILABLE }
    public enum ClaimStatus { SUPPORTED, UNSUPPORTED, UNCERTAIN }

    public record Claim(String questionId, String claim, ClaimStatus status, String reason, List<String> chunkIds) {
        public Claim {
            if (questionId == null || questionId.isBlank() || claim == null || claim.isBlank() || status == null || reason == null || reason.isBlank() || chunkIds == null) {
                throw new IllegalArgumentException("Question ID, claim text, status, reason and citations are required");
            }
            chunkIds = List.copyOf(chunkIds);
        }
    }

    public record Warning(String questionId, String claim, ClaimStatus status, String reason, List<String> chunkIds) {
        public Warning {
            if (questionId == null || questionId.isBlank() || claim == null || claim.isBlank() || status == null || reason == null || reason.isBlank() || chunkIds == null) {
                throw new IllegalArgumentException("Question ID, warning text, status, reason and citations are required");
            }
            chunkIds = List.copyOf(chunkIds);
        }
    }

    public static CurriculumEvidenceReview unavailable(String reason) {
        return new CurriculumEvidenceReview(Status.UNAVAILABLE, List.of(),
                List.of(new Warning("unavailable", "Curriculum evidence review", ClaimStatus.UNCERTAIN, reason, List.of())));
    }
}
