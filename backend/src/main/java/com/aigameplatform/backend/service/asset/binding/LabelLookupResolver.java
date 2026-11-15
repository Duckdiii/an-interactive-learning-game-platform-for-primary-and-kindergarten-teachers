package com.aigameplatform.backend.service.asset.binding;

import com.aigameplatform.backend.service.asset.AssetMatch;
import com.aigameplatform.backend.service.asset.AssetRetriever;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.List;
import java.util.Optional;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Bước 1 của chuỗi tìm hình: tra từ khóa của danh mục ({@link AssetRetriever}). Khớp được thì chọn hình điểm cao nhất và giữ
 * mọi ứng viên (gồm biến thể phong cách cùng khái niệm) cho bước khóa họ. Nhường bước sau khi không khớp gì, hoặc khi hai
 * khái niệm khác nhau hòa điểm (chữ nhắc hai vật, ví dụ "con mèo và con chó").
 */
@Component
@Order(10)
public class LabelLookupResolver implements AssetResolver {

    static final String ROUTE = "label";

    private final AssetRetriever retriever;
    private final GameAssetCatalog catalog;

    public LabelLookupResolver(AssetRetriever retriever, GameAssetCatalog catalog) {
        this.retriever = retriever;
        this.catalog = catalog;
    }

    @Override
    public Optional<AssetDecision> resolve(CellContext cell) {
        String query = cell.query();
        if (query.isEmpty()) return Optional.empty();
        List<AssetMatch> matches = retriever.match(query);
        if (matches.isEmpty()) return Optional.empty();

        AssetMatch top = matches.getFirst();
        String topLabel = labelOf(top.assetId());
        boolean anotherConceptTies = matches.stream()
                .anyMatch(match -> match.score() == top.score() && !labelOf(match.assetId()).equals(topLabel));
        if (anotherConceptTies) return Optional.empty();

        List<AssetCandidate> candidates = matches.stream()
                .map(match -> new AssetCandidate(match.assetId(), labelOf(match.assetId()), familyOf(match.assetId()),
                        match.score(), match.keyword()))
                .toList();
        String route = cell.usesSiblingText() ? ROUTE + "+text" : ROUTE;
        String reason = "khớp từ khóa \"" + top.keyword() + "\"";
        return Optional.of(new AssetDecision(cell.path(), top.assetId(), top.score(), route, reason, candidates));
    }

    // Coi hai hình là cùng khái niệm khi cùng nhãn: đúng vì biến thể phong cách giữ nguyên nhãn của mục gốc
    // (GameAssetCatalogTest kiểm). Biến thể đổi nhãn sẽ gây hòa giả và bước này nhường.
    private String labelOf(String assetId) {
        return entry(assetId).label();
    }

    private String familyOf(String assetId) {
        return entry(assetId).family();
    }

    private GameAssetCatalog.Entry entry(String assetId) {
        GameAssetCatalog.Entry entry = catalog.find(assetId);
        if (entry == null) throw new IllegalStateException("Bộ khớp trả về hình không có trong danh mục: " + assetId);
        return entry;
    }
}
