package com.aigameplatform.backend.service.factory;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Danh mục hình cho game DSL (resources/assets/game-asset-catalog.json). Prompt liệt kê id cho AI chọn vào trường {@code asset};
 * factory đổi id thành {@code imageUrl}. Id lạ thì không gán hình (frontend tự hiện thẻ chữ hoặc đoán như cũ).
 */
@Component
public class GameAssetCatalog {

    private static final String RESOURCE = "/assets/game-asset-catalog.json";

    private record Asset(String label, String url) {
    }

    private final Map<String, Asset> assets = new LinkedHashMap<>();

    public GameAssetCatalog(JsonMapper jsonMapper) {
        try (InputStream in = GameAssetCatalog.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("Thiếu danh mục hình: " + RESOURCE);
            for (JsonNode asset : jsonMapper.readTree(in).path("assets")) {
                assets.put(asset.path("id").asString(), new Asset(asset.path("label").asString(), asset.path("url").asString()));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được danh mục hình: " + RESOURCE, e);
        }
        if (assets.isEmpty()) throw new IllegalStateException("Danh mục hình rỗng: " + RESOURCE);
    }

    /** @return đường dẫn hình của id, hoặc null khi id trống/không có trong danh mục */
    public String urlOf(String assetId) {
        if (assetId == null) return null;
        Asset asset = assets.get(assetId.strip());
        return asset == null ? null : asset.url();
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
