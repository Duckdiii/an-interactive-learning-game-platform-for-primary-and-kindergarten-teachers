package com.aigameplatform.backend.service.curriculum;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** Conservative, no-network quota gate for a live synthetic exploratory evaluation. */
final class CurriculumEvaluationQuotaPlan {
    static final String EMBEDDING_BUDGET_KEY = "RAG_EVAL_CONFIRMED_EMBEDDING_REQUESTS";
    static final String REVIEWER_BUDGET_KEY = "RAG_EVAL_CONFIRMED_REVIEWER_REQUESTS";
    static final String CHECKED_AT_KEY = "RAG_EVAL_QUOTA_CHECKED_AT";
    private static final Duration MAX_CHECK_AGE = Duration.ofMinutes(15);

    record Estimate(long queries, long embeddingRequestsMax, long reviewerRequestsMax, long totalRequestsMax) { }
    record Check(boolean confirmed, long embeddingRequestsConfirmed, long reviewerRequestsConfirmed,
                 String freshness, String status) {
        Map<String, Object> asMap(Estimate estimate) {
            var result = new LinkedHashMap<String, Object>();
            result.put("quotaSource", "MANUAL_PROVIDER_CONSOLE_CONFIRMATION; no remaining-quota API is configured");
            result.put("status", status);
            result.put("checkedAtFreshness", freshness);
            result.put("confirmedEmbeddingRequests", embeddingRequestsConfirmed < 0 ? "NOT_SET" : embeddingRequestsConfirmed);
            result.put("confirmedReviewerRequests", reviewerRequestsConfirmed < 0 ? "NOT_SET" : reviewerRequestsConfirmed);
            result.put("estimate", estimate);
            result.put("retryPolicy", "0 retries; stop batch on first explicit quota/rate-limit response");
            return result;
        }
    }

    private CurriculumEvaluationQuotaPlan() { }

    static Estimate estimate(long queryCount) {
        if (queryCount < 0) throw new IllegalArgumentException("Query count cannot be negative");
        // One embedding call and at most one semantic review call per query; no retries are configured.
        return new Estimate(queryCount, queryCount, queryCount, Math.multiplyExact(queryCount, 2));
    }

    static Check check(Map<String, String> environment, Estimate estimate, Instant now) {
        long embedding = parseBudget(environment.get(EMBEDDING_BUDGET_KEY));
        long reviewer = parseBudget(environment.get(REVIEWER_BUDGET_KEY));
        String freshness = freshness(environment.get(CHECKED_AT_KEY), now);
        boolean enough = embedding >= estimate.embeddingRequestsMax() && reviewer >= estimate.reviewerRequestsMax();
        boolean current = "CURRENT".equals(freshness);
        boolean confirmed = enough && current;
        String status = confirmed ? "CONFIRMED" : !current ? "QUOTA_CHECK_REQUIRED_OR_STALE"
                : "CONFIRMED_BUDGET_BELOW_ESTIMATE";
        return new Check(confirmed, embedding, reviewer, freshness, status);
    }

    private static long parseBudget(String raw) {
        if (raw == null || raw.isBlank()) return -1;
        try {
            long value = Long.parseLong(raw.trim());
            return value < 0 ? -1 : value;
        } catch (NumberFormatException ignored) { return -1; }
    }

    private static String freshness(String raw, Instant now) {
        if (raw == null || raw.isBlank()) return "MISSING";
        try {
            Instant checked = Instant.parse(raw.trim());
            Duration age = Duration.between(checked, now);
            if (age.isNegative() || age.compareTo(MAX_CHECK_AGE) > 0) return "STALE_OR_FUTURE";
            return "CURRENT";
        } catch (RuntimeException ignored) { return "INVALID"; }
    }
}
