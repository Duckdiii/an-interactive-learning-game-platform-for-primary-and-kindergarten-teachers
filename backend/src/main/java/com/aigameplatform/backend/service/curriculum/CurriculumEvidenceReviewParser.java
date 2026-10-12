package com.aigameplatform.backend.service.curriculum;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict parser: reviewer citations must refer to chunks actually supplied to it. */
public final class CurriculumEvidenceReviewParser {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private CurriculumEvidenceReviewParser() { }

    public static CurriculumEvidenceReview parse(String json, Set<String> retrievedChunkIds, Set<String> gameQuestionIds) {
        try {
            if (gameQuestionIds == null || gameQuestionIds.isEmpty())
                throw new IllegalArgumentException("Review requires at least one game question");
            JsonNode root = JSON.readTree(json);
            JsonNode claimsNode = root == null ? null : root.get("claims");
            if (claimsNode == null || !claimsNode.isArray() || claimsNode.isEmpty())
                throw new IllegalArgumentException("Review must include at least one claim");
            List<CurriculumEvidenceReview.Claim> claims = new ArrayList<>();
            List<CurriculumEvidenceReview.Warning> warnings = new ArrayList<>();
            Set<String> reviewedQuestionIds = new HashSet<>();
            for (JsonNode node : claimsNode) {
                String questionId = requiredText(node, "questionId");
                if (!gameQuestionIds.contains(questionId))
                    throw new IllegalArgumentException("Review references an unknown game question");
                reviewedQuestionIds.add(questionId);
                String claim = requiredText(node, "claim");
                String reason = requiredText(node, "reason");
                CurriculumEvidenceReview.ClaimStatus status = CurriculumEvidenceReview.ClaimStatus.valueOf(
                        requiredText(node, "status"));
                JsonNode ids = node.get("chunkIds");
                if (ids == null || !ids.isArray() || ids.isEmpty())
                    throw new IllegalArgumentException("Every reviewed claim must cite retrieved evidence");
                List<String> chunkIds = new ArrayList<>();
                for (JsonNode id : ids) {
                    if (!id.isTextual() || !retrievedChunkIds.contains(id.asString()))
                        throw new IllegalArgumentException("Review cited an unknown curriculum chunk");
                    chunkIds.add(id.asString());
                }
                if (new HashSet<>(chunkIds).size() != chunkIds.size())
                    throw new IllegalArgumentException("Review contains duplicate citations");
                var reviewed = new CurriculumEvidenceReview.Claim(questionId, claim, status, reason, chunkIds);
                claims.add(reviewed);
                if (status != CurriculumEvidenceReview.ClaimStatus.SUPPORTED)
                    warnings.add(new CurriculumEvidenceReview.Warning(questionId, claim, status, reason, chunkIds));
            }
            if (!reviewedQuestionIds.equals(gameQuestionIds))
                throw new IllegalArgumentException("Review must cover every game question");
            return new CurriculumEvidenceReview(CurriculumEvidenceReview.Status.REVIEWED, claims, warnings);
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Malformed curriculum evidence review", exception);
        }
    }

    private static String requiredText(JsonNode node, String name) {
        JsonNode value = node.get(name);
        if (value == null || !value.isTextual() || value.asString().isBlank())
            throw new IllegalArgumentException("Review field '" + name + "' must be non-empty text");
        return value.asString();
    }
}
