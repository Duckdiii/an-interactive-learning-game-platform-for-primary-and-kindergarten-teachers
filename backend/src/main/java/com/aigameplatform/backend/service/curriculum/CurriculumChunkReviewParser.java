package com.aigameplatform.backend.service.curriculum;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Validates advisory AI chunk-review output against the exact candidate chunk ID set. */
public final class CurriculumChunkReviewParser {
    public record Review(String chunkId, String atomicity, String scopeFit, String limits,
                         String note, String disposition) { }

    private static final Set<String> CHECK_VALUES = Set.of("PASS", "NEEDS_HUMAN_REVIEW", "FAIL");
    private static final Set<String> DISPOSITIONS = Set.of("CANDIDATE_OK", "NEEDS_HUMAN_REVIEW", "REJECT");
    private final JsonMapper mapper = new JsonMapper();

    public List<Review> parse(String rawJson, Set<String> expectedChunkIds) {
        if (rawJson == null || rawJson.isBlank() || expectedChunkIds == null || expectedChunkIds.isEmpty()) {
            throw new IllegalArgumentException("Review output and expected chunk IDs are required");
        }
        JsonNode root;
        try {
            root = mapper.readTree(rawJson);
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("Chunk review output is not valid JSON", exception);
        }
        JsonNode reviewsNode = root == null ? null : root.get("reviews");
        if (reviewsNode == null || !reviewsNode.isArray() || reviewsNode.size() != expectedChunkIds.size()) {
            throw new IllegalArgumentException("Review must contain exactly one result per expected chunk");
        }
        var result = new ArrayList<Review>();
        var seen = new HashSet<String>();
        for (JsonNode node : reviewsNode) {
            String chunkId = text(node, "chunkId");
            String atomicity = text(node, "atomicity");
            String scopeFit = text(node, "scopeFit");
            String limits = text(node, "limits");
            String note = text(node, "note");
            String disposition = text(node, "disposition");
            if (!expectedChunkIds.contains(chunkId) || !seen.add(chunkId)
                    || !CHECK_VALUES.contains(atomicity) || !CHECK_VALUES.contains(scopeFit)
                    || !CHECK_VALUES.contains(limits) || !DISPOSITIONS.contains(disposition)) {
                throw new IllegalArgumentException("Invalid, duplicate, or unexpected chunk review: " + chunkId);
            }
            result.add(new Review(chunkId, atomicity, scopeFit, limits, note, disposition));
        }
        if (!seen.equals(expectedChunkIds)) {
            throw new IllegalArgumentException("Review omitted one or more expected chunk IDs");
        }
        return List.copyOf(result);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isString() || value.asString().isBlank()) {
            throw new IllegalArgumentException("Chunk review field is missing or invalid: " + field);
        }
        return value.asString();
    }
}
