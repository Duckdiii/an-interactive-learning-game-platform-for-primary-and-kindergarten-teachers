package com.aigameplatform.backend.service.asset.binding;

import java.util.List;
import java.util.Objects;
import tools.jackson.databind.JsonNode;

/**
 * Kết quả gán hình cho cả một game.
 *
 * @param output JSON đầu ra của AI đã điền hoặc ghi đè trường {@code asset}
 * @param decisions một quyết định cho mỗi ô cần hình, theo thứ tự gặp trong JSON
 */
public record BindingResult(JsonNode output, List<AssetDecision> decisions) {

    public BindingResult {
        Objects.requireNonNull(output, "output");
        decisions = decisions == null ? List.of() : List.copyOf(decisions);
    }
}
