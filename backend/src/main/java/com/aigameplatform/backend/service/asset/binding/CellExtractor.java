package com.aigameplatform.backend.service.asset.binding;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Trích xuất mọi ô cần hình (nút mang {@code visualPrompt}, {@code asset}, hoặc chữ của ô) từ cây JSON đầu ra của AI.
 * Đi cây generic, không phụ thuộc tên loại game cụ thể.
 */
@Component
public class CellExtractor {

    private static final List<String> SIBLING_FIELDS = List.of(
            "text", "correct", "correctAnswer", "correctWord", "targetDescription"
    );

    public List<CellContext> extract(JsonNode root) {
        List<CellContext> cells = new ArrayList<>();
        if (root != null) {
            walk(root, "", cells);
        }
        return cells;
    }

    private void walk(JsonNode node, String path, List<CellContext> cells) {
        if (node == null) return;
        if (node.isObject()) {
            ObjectNode obj = (ObjectNode) node;
            if (isCell(obj)) {
                cells.add(toCell(obj, path));
                return;
            }
            obj.properties().forEach(entry -> walk(entry.getValue(), path + "/" + entry.getKey(), cells));
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                walk(node.get(i), path + "/" + i, cells);
            }
        }
    }

    private boolean isCell(ObjectNode node) {
        if (node.has("visualPrompt") || node.has("asset")) {
            return true;
        }
        for (String field : SIBLING_FIELDS) {
            JsonNode val = node.path(field);
            if (val.isString() && !val.asString().isBlank()) {
                return true;
            }
        }
        return false;
    }

    private CellContext toCell(ObjectNode node, String path) {
        String visualPrompt = null;
        JsonNode vpNode = node.path("visualPrompt");
        if (vpNode.isString() && !vpNode.asString().isBlank()) {
            visualPrompt = vpNode.asString().strip();
        }

        String currentAsset = null;
        JsonNode assetNode = node.path("asset");
        if (assetNode.isString() && !assetNode.asString().isBlank()) {
            currentAsset = assetNode.asString().strip();
        }

        String siblingText = null;
        if (visualPrompt == null) {
            List<String> parts = new ArrayList<>();
            for (String field : SIBLING_FIELDS) {
                JsonNode val = node.path(field);
                if (val.isString() && !val.asString().isBlank()) {
                    parts.add(val.asString().strip());
                }
            }
            if (!parts.isEmpty()) {
                siblingText = String.join(" ", parts);
            }
        }

        return new CellContext(path, visualPrompt, siblingText, currentAsset);
    }
}
