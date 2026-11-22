package com.aigameplatform.backend.service.asset.binding;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Quyết định gán hình cho một ô, kèm lý do để đọc lại được vì sao có hình đó.
 *
 * @param path đường dẫn JSON của ô
 * @param assetId id hình được chọn, hoặc null khi không có hình đủ tốt (frontend hiện thẻ chữ). Ở đầu ra của resolver đây
 *                chỉ là lựa chọn mặc định của khái niệm; bước khóa họ có thể đổi sang biến thể khác trong {@code candidates}
 * @param score điểm của hình được chọn; 0 khi không có hình, không âm
 * @param route bước đã quyết định (ví dụ {@code label}, {@code concept}); thêm đuôi {@code +text} khi truy vấn lấy từ chữ
 *              của ô, {@code +style-lock} khi bước khóa họ đã đổi sang biến thể khác
 * @param reason lý do ngắn, đọc được
 * @param candidates các ứng viên đã xét, điểm giảm dần; để khóa họ chọn biến thể và để ghi log. Có hình thì phải gồm cả
 *                   ứng viên của hình đó
 */
public record AssetDecision(String path, String assetId, int score, String route, String reason,
                            List<AssetCandidate> candidates) {

    public AssetDecision {
        Objects.requireNonNull(path, "path");
        Objects.requireNonNull(route, "route");
        Objects.requireNonNull(reason, "reason");
        candidates = candidates == null ? List.of() : List.copyOf(candidates);
        if (assetId == null && score != 0) throw new IllegalArgumentException("Không có hình thì điểm phải là 0");
        if (assetId != null && assetId.isBlank()) throw new IllegalArgumentException("assetId rỗng");
        if (score < 0) throw new IllegalArgumentException("Điểm không được âm");
        String chosen = assetId;
        if (chosen != null && candidates.stream().noneMatch(candidate -> candidate.assetId().equals(chosen))) {
            throw new IllegalArgumentException("Hình được chọn phải có trong candidates: " + assetId);
        }
    }

    /** Ứng viên của hình được chọn; rỗng khi không có hình. */
    public Optional<AssetCandidate> chosen() {
        return candidates.stream().filter(candidate -> candidate.assetId().equals(assetId)).findFirst();
    }

    /** Không có hình đủ tốt cho ô này. */
    public static AssetDecision none(String path, String route, String reason, List<AssetCandidate> candidates) {
        return new AssetDecision(path, null, 0, route, reason, candidates);
    }

    public boolean hasAsset() {
        return assetId != null;
    }
}
