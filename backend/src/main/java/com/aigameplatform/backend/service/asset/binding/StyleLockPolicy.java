package com.aigameplatform.backend.service.asset.binding;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Khóa họ phong cách cho cả game, để các hình trong một màn chơi cùng một kiểu vẽ.
 * <ol>
 *   <li>Mỗi họ được tính số ô có bản ở họ đó (biến thể = ứng viên cùng nhãn với hình được chọn của ô).</li>
 *   <li>Họ phủ nhiều ô nhất được khóa; hòa thì họ được chọn mặc định ở nhiều ô hơn thắng, rồi theo tên họ cho cố định.</li>
 *   <li>Ô có bản họ đã khóa thì lấy bản đó; không có thì lấy họ còn lại phủ nhiều ô nhất; ô không có hình thì giữ nguyên
 *       (frontend hiện chữ) và không tính vào mẫu số.</li>
 *   <li>Họ dẫn đầu phủ dưới {@code min-coverage} số ô có hình thì không khóa: đổi kiểu vẽ không đáng khi phần lớn ô không theo.</li>
 * </ol>
 * Ô giữ hình của AI (chế độ {@code fill-empty}) chỉ được tính cho họ của chính hình đó và không bị đổi.
 */
@Component
public class StyleLockPolicy {

    static final String ROUTE_SUFFIX = "+style-lock";

    private final boolean enabled;
    private final double minCoverage;

    public StyleLockPolicy(@Value("${app.assets.binder.style-lock.enabled:true}") boolean enabled,
                           @Value("${app.assets.binder.style-lock.min-coverage:0.6}") double minCoverage) {
        // Viết dạng phủ định để NaN cũng bị từ chối.
        if (!(minCoverage >= 0 && minCoverage <= 1)) {
            throw new IllegalArgumentException("min-coverage phải trong [0, 1]: " + minCoverage);
        }
        this.enabled = enabled;
        this.minCoverage = minCoverage;
    }

    /**
     * @param decisions quyết định của từng ô, theo thứ tự ô
     * @param keptPaths đường dẫn các ô giữ nguyên hình AI đã chọn ({@code Set.of()} ở chế độ {@code override})
     * @return quyết định sau khi khóa họ, cùng thứ tự
     */
    public List<AssetDecision> apply(List<AssetDecision> decisions, Set<String> keptPaths) {
        if (!enabled) return decisions;
        List<AssetDecision> withAsset = decisions.stream().filter(AssetDecision::hasAsset).toList();
        if (withAsset.isEmpty()) return decisions;

        Map<String, Integer> coverage = new HashMap<>();
        Map<String, Integer> defaults = new HashMap<>();
        for (AssetDecision decision : withAsset) {
            String defaultFamily = decision.chosen().orElseThrow().family();
            Set<String> families = keptPaths.contains(decision.path()) ? Set.of(defaultFamily) : variantsByFamily(decision).keySet();
            for (String family : families) coverage.merge(family, 1, Integer::sum);
            defaults.merge(defaultFamily, 1, Integer::sum);
        }
        List<String> ranking = new ArrayList<>(coverage.keySet());
        ranking.sort(Comparator.<String>comparingInt(coverage::get).reversed()
                .thenComparing(Comparator.<String>comparingInt(family -> defaults.getOrDefault(family, 0)).reversed())
                .thenComparing(Comparator.naturalOrder()));
        String locked = ranking.getFirst();
        if (coverage.get(locked) < minCoverage * withAsset.size()) return decisions;

        return decisions.stream()
                .map(decision -> !decision.hasAsset() || keptPaths.contains(decision.path())
                        ? decision : relock(decision, ranking, locked))
                .toList();
    }

    private static AssetDecision relock(AssetDecision decision, List<String> ranking, String locked) {
        Map<String, AssetCandidate> variants = variantsByFamily(decision);
        // Hình được chọn luôn là một biến thể nên luôn tìm được họ.
        String family = ranking.stream().filter(variants::containsKey).findFirst().orElseThrow();
        AssetCandidate chosen = variants.get(family);
        if (chosen.assetId().equals(decision.assetId())) return decision;
        String note = family.equals(locked) ? "khóa họ " + locked : "không có bản họ " + locked + ", lấy họ " + family;
        return new AssetDecision(decision.path(), chosen.assetId(), chosen.score(), decision.route() + ROUTE_SUFFIX,
                decision.reason() + "; " + note, decision.candidates());
    }

    /**
     * Biến thể của hình được chọn theo họ: họ của chính hình đó lấy chính nó, họ khác lấy ứng viên cùng nhãn đầu tiên
     * (resolver giữ thứ tự danh mục, mục gốc đứng trước biến thể).
     */
    private static Map<String, AssetCandidate> variantsByFamily(AssetDecision decision) {
        AssetCandidate current = decision.chosen().orElseThrow();
        Map<String, AssetCandidate> variants = new LinkedHashMap<>();
        variants.put(current.family(), current);
        for (AssetCandidate candidate : decision.candidates()) {
            if (candidate.label().equals(current.label())) variants.putIfAbsent(candidate.family(), candidate);
        }
        return variants;
    }
}
