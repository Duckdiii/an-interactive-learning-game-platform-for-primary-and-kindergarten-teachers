package com.aigameplatform.backend.service.factory;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Danh mục hình cho game DSL (resources/assets/game-asset-catalog.json, sinh từ ASSET_CATALOG của frontend bằng
 * scripts/assets/build-game-asset-catalog.mjs). Prompt liệt kê id cho AI chọn vào trường {@code asset}; factory đổi id thành
 * {@code imageUrl}. Id lạ thì không gán hình (frontend tự hiện thẻ chữ hoặc đoán như cũ).
 */
@Component
public class GameAssetCatalog {

    private static final String RESOURCE = "/assets/game-asset-catalog.json";

    /**
     * Một hình trong danh mục.
     *
     * @param group nhóm nghĩa (animal, food, body...); rỗng nếu JSON cũ chưa có
     * @param family họ phong cách (openmoji, fluent, kenney, custom); rỗng nếu JSON cũ chưa có
     * @param keywords từ khóa không dấu để khớp chữ với hình
     * @param exactKeywords từ khóa có dấu, khớp nguyên từ và phân biệt dấu ("bàn" khác "bạn"), cho từ ngắn trùng âm khi bỏ dấu
     */
    public record Entry(String id, String label, String url, String group, String family, List<String> keywords,
                        List<String> exactKeywords) {
    }

    private final Map<String, Entry> assets = new LinkedHashMap<>();

    public GameAssetCatalog(JsonMapper jsonMapper) {
        try (InputStream in = GameAssetCatalog.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("Thiếu danh mục hình: " + RESOURCE);
            for (JsonNode asset : jsonMapper.readTree(in).path("assets")) {
                String id = asset.path("id").asString();
                assets.put(id, new Entry(id, asset.path("label").asString(), asset.path("url").asString(),
                        asset.path("group").asString(), asset.path("family").asString(),
                        strings(asset.path("keywords")), strings(asset.path("exactKeywords"))));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được danh mục hình: " + RESOURCE, e);
        }
        if (assets.isEmpty()) throw new IllegalStateException("Danh mục hình rỗng: " + RESOURCE);
    }

    private static List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        for (JsonNode value : array) values.add(value.asString());
        return List.copyOf(values);
    }

    /** @return đường dẫn hình của id, hoặc null khi id trống/không có trong danh mục */
    public String urlOf(String assetId) {
        Entry entry = find(assetId);
        return entry == null ? null : entry.url();
    }

    /** @return hình của id (bỏ khoảng trắng hai đầu), hoặc null khi id trống/không có trong danh mục */
    public Entry find(String assetId) {
        return assetId == null ? null : assets.get(assetId.strip());
    }

    /** @return hình có đường dẫn này, hoặc null (ví dụ hình do giáo viên tự tải lên không thuộc danh mục) */
    public Entry findByUrl(String url) {
        if (url == null) return null;
        return assets.values().stream().filter(entry -> entry.url().equals(url)).findFirst().orElse(null);
    }

    /** Mọi hình, giữ thứ tự trong file. */
    public List<Entry> entries() {
        return List.copyOf(assets.values());
    }

    /** id → đường dẫn, giữ thứ tự trong file. */
    public Map<String, String> urls() {
        return assets.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().url(),
                (first, second) -> first, LinkedHashMap::new));
    }

    /** Một dòng "id: nhãn" cho mỗi hình, để đưa vào prompt. */
    public String promptList() {
        return assets.entrySet().stream().map(entry -> entry.getKey() + ": " + entry.getValue().label())
                .collect(Collectors.joining("\n"));
    }
}
