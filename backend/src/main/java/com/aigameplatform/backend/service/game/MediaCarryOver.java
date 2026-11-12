package com.aigameplatform.backend.service.game;

import java.util.HashMap;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Sau khi AI sửa game DSL: đầu ra AI không chứa đường dẫn hình/âm thanh (chỉ mã hình trong danh mục), nên mục giáo viên không
 * yêu cầu đổi có thể mất ảnh tự tải hoặc tiếng đã gắn. Mục còn giữ đúng `visualPrompt` (hay `audioText`) mà chưa có
 * `imageUrl` (`audioUrl`) thì lấy lại đường dẫn cũ. Mục đã đổi mô tả thì để AI/danh mục chọn hình mới.
 */
final class MediaCarryOver {

    private MediaCarryOver() {
    }

    static void restore(JsonNode current, ObjectNode revised) {
        Map<String, String> images = new HashMap<>();
        Map<String, String> sounds = new HashMap<>();
        collect(current, images, sounds);
        fill(revised, images, sounds);
    }

    private static void collect(JsonNode node, Map<String, String> images, Map<String, String> sounds) {
        if (node.isObject()) {
            remember(node, "visualPrompt", "imageUrl", images);
            remember(node, "audioText", "audioUrl", sounds);
        }
        if (node.isObject() || node.isArray()) node.forEach(child -> collect(child, images, sounds));
    }

    private static void remember(JsonNode node, String key, String url, Map<String, String> into) {
        if (node.path(key).isString() && node.path(url).isString()) into.putIfAbsent(node.path(key).asString(), node.path(url).asString());
    }

    private static void fill(JsonNode node, Map<String, String> images, Map<String, String> sounds) {
        if (node instanceof ObjectNode object) {
            put(object, "visualPrompt", "imageUrl", images);
            put(object, "audioText", "audioUrl", sounds);
        }
        if (node.isObject() || node.isArray()) node.forEach(child -> fill(child, images, sounds));
    }

    private static void put(ObjectNode object, String key, String url, Map<String, String> from) {
        if (!object.has(url) && object.path(key).isString() && from.containsKey(object.path(key).asString())) {
            object.put(url, from.get(object.path(key).asString()));
        }
    }
}
