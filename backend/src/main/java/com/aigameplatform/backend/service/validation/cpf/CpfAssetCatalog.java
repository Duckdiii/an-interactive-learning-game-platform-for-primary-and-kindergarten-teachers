package com.aigameplatform.backend.service.validation.cpf;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Danh mục assetId hợp lệ của CPF (resources/cpf/asset-catalog.json): Lớp 2 kiểm id, prompt AI liệt kê cho AI chọn. */
@Component
public class CpfAssetCatalog {

    private static final String RESOURCE = "/cpf/asset-catalog.json";

    private final Map<String, String> labels = new LinkedHashMap<>();

    public CpfAssetCatalog(JsonMapper jsonMapper) {
        try (InputStream in = CpfAssetCatalog.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("Thiếu danh mục asset CPF: " + RESOURCE);
            for (JsonNode asset : jsonMapper.readTree(in).path("assets")) {
                labels.put(asset.path("id").asString(), asset.path("label").asString());
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được danh mục asset CPF: " + RESOURCE, e);
        }
        if (labels.isEmpty()) throw new IllegalStateException("Danh mục asset CPF rỗng: " + RESOURCE);
    }

    public boolean contains(String assetId) {
        return labels.containsKey(assetId);
    }

    public Set<String> ids() {
        return Collections.unmodifiableSet(labels.keySet());
    }

    /** id → nhãn tiếng Việt, giữ thứ tự trong file (prompt AI ổn định giữa các lần gọi). */
    public Map<String, String> labels() {
        return Collections.unmodifiableMap(labels);
    }
}
