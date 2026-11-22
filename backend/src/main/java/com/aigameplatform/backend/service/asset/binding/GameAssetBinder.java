package com.aigameplatform.backend.service.asset.binding;

import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.NullNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Điều phối quy trình gán hình:
 * <ol>
 *   <li>Trích xuất mọi ô cần hình qua {@link CellExtractor}.</li>
 *   <li>Chạy chuỗi {@link AssetResolver} (tra từ khóa danh mục rồi đến đồ thị khái niệm) để tìm ứng viên và quyết định mặc định.</li>
 *   <li>Áp dụng {@link StyleLockPolicy} để đồng bộ họ phong cách cho toàn bộ game.</li>
 *   <li>Ghi id hình đã chốt vào cây JSON (hoặc xóa trường {@code asset} nếu không có hình phù hợp).</li>
 * </ol>
 * Ở chế độ {@link BindMode#FILL_EMPTY}, các ô đã có id hình hợp lệ trong danh mục sẽ được giữ nguyên (vẫn tham gia đếm họ).
 * Ở chế độ {@link BindMode#OVERRIDE}, binder quyết định lại mọi ô.
 */
@Component
public class GameAssetBinder implements AssetBinder {

    private static final Logger log = LoggerFactory.getLogger(GameAssetBinder.class);

    private final CellExtractor cellExtractor;
    private final List<AssetResolver> resolvers;
    private final StyleLockPolicy styleLockPolicy;
    private final GameAssetCatalog catalog;

    public GameAssetBinder(CellExtractor cellExtractor, List<AssetResolver> resolvers,
                           StyleLockPolicy styleLockPolicy, GameAssetCatalog catalog) {
        this.cellExtractor = Objects.requireNonNull(cellExtractor, "cellExtractor");
        this.resolvers = resolvers == null ? List.of() : List.copyOf(resolvers);
        this.styleLockPolicy = Objects.requireNonNull(styleLockPolicy, "styleLockPolicy");
        this.catalog = Objects.requireNonNull(catalog, "catalog");
    }

    @Override
    public BindingResult bind(JsonNode aiOutput, BindMode mode) {
        if (aiOutput == null || !aiOutput.isObject()) {
            return new BindingResult(aiOutput == null ? NullNode.getInstance() : aiOutput, List.of());
        }
        BindMode bindMode = mode == null ? BindMode.FILL_EMPTY : mode;
        JsonNode output = aiOutput.deepCopy();
        List<CellContext> cells = cellExtractor.extract(output);
        if (cells.isEmpty()) {
            return new BindingResult(output, List.of());
        }

        Set<String> keptPaths = new HashSet<>();
        List<AssetDecision> initialDecisions = new ArrayList<>();

        for (CellContext cell : cells) {
            if (bindMode == BindMode.FILL_EMPTY && cell.currentAsset() != null) {
                GameAssetCatalog.Entry entry = catalog.find(cell.currentAsset());
                if (entry != null) {
                    AssetCandidate candidate = new AssetCandidate(
                            entry.id(), entry.label(), entry.family(), 100, "ai"
                    );
                    AssetDecision decision = new AssetDecision(
                            cell.path(), entry.id(), 100, "ai", "giữ hình AI đã chọn", List.of(candidate)
                    );
                    keptPaths.add(cell.path());
                    initialDecisions.add(decision);
                    continue;
                }
            }

            AssetDecision decision = resolveCell(cell);
            initialDecisions.add(decision);
        }

        List<AssetDecision> finalDecisions = styleLockPolicy.apply(initialDecisions, keptPaths);

        for (AssetDecision decision : finalDecisions) {
            applyDecisionToNode(output, decision);
            if (log.isDebugEnabled()) {
                log.debug("Asset decision for {}: assetId={}, score={}, route={}, reason={}",
                        decision.path(), decision.assetId(), decision.score(), decision.route(), decision.reason());
            }
        }

        return new BindingResult(output, finalDecisions);
    }

    private AssetDecision resolveCell(CellContext cell) {
        for (AssetResolver resolver : resolvers) {
            Optional<AssetDecision> opt = resolver.resolve(cell);
            if (opt.isPresent()) {
                return opt.get();
            }
        }
        return AssetDecision.none(cell.path(), "unresolved", "không tìm được hình phù hợp", List.of());
    }

    private static void applyDecisionToNode(JsonNode root, AssetDecision decision) {
        JsonNode target = root.at(decision.path());
        if (target.isObject()) {
            ObjectNode obj = (ObjectNode) target;
            if (decision.hasAsset()) {
                obj.put("asset", decision.assetId());
            } else {
                obj.remove("asset");
            }
        }
    }
}
