package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.service.asset.binding.AssetBinder;
import com.aigameplatform.backend.service.asset.binding.BindMode;
import com.aigameplatform.backend.service.asset.binding.BindingResult;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Decorator bọc {@link GeminiGameContentGenerator} để bổ sung bước gán hình tường minh:
 * <ol>
 *   <li>Gọi delegate để lấy JSON thô do AI sinh.</li>
 *   <li>Kiểm tra xem schema có trường {@code asset} hay không (loại như ODD_ONE_OUT không có thì trả nguyên JSON).</li>
 *   <li>Chạy {@link AssetBinder} để điền hoặc ghi đè trường {@code asset} cho các ô cần hình.</li>
 * </ol>
 * Nếu JSON thô bị hỏng hoặc xảy ra lỗi bất ngờ lúc gán hình, decorator log cảnh báo và trả nguyên raw JSON (fail-safe).
 * Nếu delegate ném lỗi (hết quota, timeout, lỗi mạng...), decorator để ngoại lệ ném tiếp nguyên vẹn.
 */
@Component
@Primary
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
@ConditionalOnProperty(name = "app.assets.binder.enabled", havingValue = "true")
public class AssetBindingGameContentGenerator implements GameContentGenerator {

    private static final Logger log = LoggerFactory.getLogger(AssetBindingGameContentGenerator.class);

    private final GeminiGameContentGenerator delegate;
    private final AssetBinder binder;
    private final JsonMapper jsonMapper;
    private final BindMode mode;

    public AssetBindingGameContentGenerator(
            GeminiGameContentGenerator delegate,
            AssetBinder binder,
            JsonMapper jsonMapper,
            @Value("${app.assets.binder.mode:fill-empty}") String modeProperty) {
        this.delegate = Objects.requireNonNull(delegate, "delegate");
        this.binder = Objects.requireNonNull(binder, "binder");
        this.jsonMapper = Objects.requireNonNull(jsonMapper, "jsonMapper");
        this.mode = BindMode.fromProperty(modeProperty);
    }

    @Override
    public String generate(GenerationAttempt attempt) {
        String raw = delegate.generate(attempt);
        if (raw == null || raw.isBlank()) {
            return raw;
        }

        if (!hasAssetProperty(attempt.structuredSchema())) {
            return raw;
        }

        try {
            JsonNode root = jsonMapper.readTree(raw);
            BindingResult result = binder.bind(root, mode);
            return jsonMapper.writeValueAsString(result.output());
        } catch (Exception e) {
            log.warn("Lỗi khi gán asset vào JSON đầu ra của AI, trả về JSON thô: {}", e.getMessage(), e);
            return raw;
        }
    }

    private boolean hasAssetProperty(String structuredSchema) {
        if (structuredSchema == null || structuredSchema.isBlank()) {
            return false;
        }
        try {
            JsonNode schemaNode = jsonMapper.readTree(structuredSchema);
            return containsAsset(schemaNode);
        } catch (Exception e) {
            log.warn("Không đọc được structuredSchema: {}", e.getMessage());
            return false;
        }
    }

    private static boolean containsAsset(JsonNode node) {
        if (node == null) return false;
        if (node.isObject() && node.path("properties").has("asset")) {
            return true;
        }
        for (JsonNode child : node) {
            if (containsAsset(child)) {
                return true;
            }
        }
        return false;
    }
}
