package com.aigameplatform.backend.service.asset.binding;

import tools.jackson.databind.JsonNode;

/** Gán hình cho mọi ô cần hình trong JSON đầu ra của AI, kèm quyết định có lý do cho từng ô. */
public interface AssetBinder {

    /**
     * @param aiOutput JSON đầu ra của AI; không bị sửa, kết quả là bản sao
     * @param mode điền ô trống hay quyết định mọi ô
     */
    BindingResult bind(JsonNode aiOutput, BindMode mode);
}
