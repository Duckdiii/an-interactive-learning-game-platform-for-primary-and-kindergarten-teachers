package com.aigameplatform.backend.service.validation.safety;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/** Lấy mọi đoạn chữ trong game cần kiểm duyệt an toàn, kèm vị trí của chúng. Bỏ qua id, URL và giá trị kỹ thuật. */
public final class GameTextExtractor {

    /** Các trường không phải nội dung cho người đọc. */
    private static final Set<String> TECHNICAL_KEYS =
            Set.of("schemaVersion", "gameType", "subject", "gradeLevel", "scrambledLetters");

    private GameTextExtractor() {
    }

    public record TextEntry(String path, String text) {
    }

    public static List<TextEntry> extract(JsonNode json) {
        List<TextEntry> entries = new ArrayList<>();
        collect(json, "$", entries);
        return entries;
    }

    private static void collect(JsonNode node, String path, List<TextEntry> entries) {
        if (node.isString()) {
            entries.add(new TextEntry(path, node.asString()));
        } else if (node.isObject()) {
            node.properties().forEach(entry -> {
                if (!isTechnical(entry.getKey())) {
                    collect(entry.getValue(), path + "." + entry.getKey(), entries);
                }
            });
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                collect(node.get(i), path + "[" + i + "]", entries);
            }
        }
    }

    private static boolean isTechnical(String key) {
        return key.equals("id") || key.endsWith("Id") || key.endsWith("Url") || TECHNICAL_KEYS.contains(key);
    }
}
