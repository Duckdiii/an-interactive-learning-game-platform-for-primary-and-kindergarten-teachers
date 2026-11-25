package com.aigameplatform.backend.service.asset;

import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Khớp từ khóa nguyên từ theo hai lớp:
 * <ul>
 *   <li>không dấu: chữ và từ khóa đều qua {@link VietnameseText#normalize} (chịu được viết thiếu dấu); từ khóa phải xuất hiện
 *       thành từ trọn vẹn, nên "cai ban" không khớp trong "cai bang". Nhãn hiển thị của hình (không có ngoặc) cũng là từ khóa;</li>
 *   <li>có dấu: từ khóa ngắn trùng âm khi bỏ dấu ("bàn" với "bạn") khớp theo {@link VietnameseText#fold}, phân biệt dấu.</li>
 * </ul>
 */
@Component
public class KeywordAssetRetriever implements AssetRetriever {

    private record Indexed(String assetId, List<String> keywords, List<String> exactKeywords) {
    }

    /** Từ khóa một chữ ngắn ("cho", "ca", "xe", "đầu"...) quá hay là từ thường trong câu dài, nên chỉ khớp ở chữ ngắn (thẻ chữ, nhãn). */
    private static final int MAX_WORDS_FOR_SINGLE_WORD_KEYWORD = 3;
    private static final int MAX_LENGTH_OF_AMBIGUOUS_KEYWORD = 5;

    private final List<Indexed> index = new ArrayList<>();

    public KeywordAssetRetriever(GameAssetCatalog catalog) {
        for (GameAssetCatalog.Entry entry : catalog.entries()) {
            Set<String> keywords = new LinkedHashSet<>();
            for (String keyword : entry.keywords()) addNormalized(keywords, keyword);
            // Nhãn có ngoặc là nhãn dài để phân biệt với hình khác ("Quả bóng tròn đồ chơi (không phải bóng bay)"): bỏ qua.
            if (!entry.label().contains("(")) addNormalized(keywords, entry.label());
            Set<String> exact = new LinkedHashSet<>();
            for (String keyword : entry.exactKeywords()) {
                String folded = VietnameseText.fold(keyword);
                if (!folded.isEmpty()) exact.add(folded);
            }
            index.add(new Indexed(entry.id(), List.copyOf(keywords), List.copyOf(exact)));
        }
    }

    private static void addNormalized(Set<String> keywords, String raw) {
        String keyword = VietnameseText.normalize(raw);
        if (!keyword.isEmpty()) keywords.add(keyword);
    }

    @Override
    public List<AssetMatch> match(String text) {
        return match(text, false);
    }

    @Override
    public boolean mentions(String text, String assetId) {
        return match(text, true).stream().anyMatch(match -> match.assetId().equals(assetId));
    }

    private List<AssetMatch> match(String text, boolean allowAmbiguousKeywords) {
        String plain = " " + VietnameseText.normalize(text) + " ";
        String accented = " " + VietnameseText.fold(text) + " ";
        boolean shortText = allowAmbiguousKeywords || plain.strip().split(" +").length <= MAX_WORDS_FOR_SINGLE_WORD_KEYWORD;
        List<AssetMatch> matches = new ArrayList<>();
        for (Indexed asset : index) {
            String best = longestIn(asset.keywords(), plain, shortText);
            String bestExact = longestIn(asset.exactKeywords(), accented, shortText);
            if (bestExact != null && (best == null || bestExact.length() > best.length())) best = bestExact;
            if (best != null) matches.add(new AssetMatch(asset.assetId(), best, best.length()));
        }
        // sort ổn định: bằng điểm thì giữ thứ tự trong danh mục.
        matches.sort(Comparator.comparingInt(AssetMatch::score).reversed());
        return List.copyOf(matches);
    }

    private static String longestIn(List<String> keywords, String paddedText, boolean shortText) {
        String best = null;
        for (String keyword : keywords) {
            if (!shortText && keyword.indexOf(' ') < 0 && keyword.length() <= MAX_LENGTH_OF_AMBIGUOUS_KEYWORD && !Character.isDigit(keyword.charAt(0))) continue;
            if (paddedText.contains(" " + keyword + " ") && (best == null || keyword.length() > best.length())) best = keyword;
        }
        return best;
    }
}
