package com.aigameplatform.backend.service.validation.safety;

import java.util.List;
import java.util.Map;

/** Kết quả kiểm duyệt từ nhà cung cấp, trước khi áp dụng ngưỡng quản trị. */
public record ModerationResult(boolean flagged, List<String> categories, Map<String, Double> categoryScores) {
    public ModerationResult(boolean flagged, List<String> categories) {
        this(flagged, categories, Map.of());
    }

    public ModerationResult {
        categoryScores = Map.copyOf(categoryScores);
    }
}
