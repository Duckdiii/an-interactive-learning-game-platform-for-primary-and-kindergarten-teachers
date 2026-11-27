package com.aigameplatform.backend.service.asset.binding;

import com.aigameplatform.backend.service.asset.VietnameseText;
import com.aigameplatform.backend.service.asset.concept.Concept;
import com.aigameplatform.backend.service.asset.concept.ConceptGraph;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Bước 2 của chuỗi tìm hình: khi tra từ khóa danh mục không ra, tìm khái niệm qua nhãn hoặc đồng nghĩa CÓ DẤU trong đồ thị
 * khái niệm (ví dụ "cún", "mèo con", "gà mái"), rồi lấy mọi hình của khái niệm đó làm ứng viên.
 * <ul>
 *   <li>So chữ giữ dấu ({@link VietnameseText#fold}), khớp nguyên cụm từ, cụm dài nhất thắng ("gà con" thắng "gà").</li>
 *   <li>Đồng nghĩa một chữ ("bò", "kiến", "cá") hay nằm trong từ thường ("bé bò", "kiến thức", "cá nhân"), nên chỉ khớp khi
 *       đứng một mình hoặc ngay sau loại từ "con"/"chú" ("chú cún chạy trên cỏ").</li>
 *   <li>Hai cụm cùng độ dài chồng lên nhau ("con gà con": "con gà" và "gà con") là một tên gọi: lấy cụm bắt đầu sau, vì loại
 *       từ "con" đứng trước tên. Hai cụm không chồng nhau thuộc hai khái niệm khác nhau là chữ nhắc hai vật: nhường.</li>
 *   <li>Chỉ xét khái niệm có hình; nút nhóm ("vật nuôi", "con vật dưới nước") không che khái niệm cụ thể trong cùng câu.</li>
 * </ul>
 */
@Component
@Order(20)
public class ConceptGraphResolver implements AssetResolver {

    static final String ROUTE = "concept";
    private static final List<String> CLASSIFIERS = List.of("con", "chú");

    private record Term(String text, Concept concept, boolean singleWord) {
    }

    private record Hit(Term term, int start) {
        int end() {
            return start + term.text().length();
        }

        boolean overlaps(Hit other) {
            return start < other.end() && other.start < end();
        }
    }

    private final GameAssetCatalog catalog;
    private final List<Term> terms = new ArrayList<>();

    public ConceptGraphResolver(ConceptGraph graph, GameAssetCatalog catalog) {
        this.catalog = catalog;
        for (Concept concept : graph.concepts()) {
            if (concept.assets().isEmpty()) continue;
            addTerm(concept.labelVi(), concept);
            for (String synonym : concept.synonyms()) addTerm(synonym, concept);
        }
    }

    private void addTerm(String raw, Concept concept) {
        String folded = VietnameseText.fold(raw);
        if (!folded.isEmpty()) terms.add(new Term(folded, concept, !folded.contains(" ")));
    }

    @Override
    public Optional<AssetDecision> resolve(CellContext cell) {
        String text = VietnameseText.fold(cell.query());
        if (text.isEmpty()) return Optional.empty();

        List<Hit> hits = new ArrayList<>();
        for (Term term : terms) {
            int start = find(text, term);
            if (start >= 0) hits.add(new Hit(term, start));
        }
        Hit best = null;
        for (Hit hit : hits) {
            if (best == null || hit.term().text().length() > best.term().text().length()
                    || hit.term().text().length() == best.term().text().length() && hit.overlaps(best) && hit.start() > best.start()) {
                best = hit;
            }
        }
        if (best == null) return Optional.empty();
        Hit chosen = best;
        boolean anotherThingNamed = hits.stream().anyMatch(hit -> hit.term().text().length() == chosen.term().text().length()
                && !hit.overlaps(chosen) && !hit.term().concept().id().equals(chosen.term().concept().id()));
        if (anotherThingNamed) return Optional.empty();

        Concept concept = chosen.term().concept();
        int score = chosen.term().text().length();
        List<AssetCandidate> candidates = concept.assets().stream()
                .map(assetId -> {
                    GameAssetCatalog.Entry entry = entry(assetId);
                    return new AssetCandidate(assetId, entry.label(), entry.family(), score, concept.id());
                }).toList();
        String route = cell.usesSiblingText() ? ROUTE + "+text" : ROUTE;
        String reason = "khái niệm " + concept.labelVi() + " (" + concept.id() + ") qua cụm \"" + chosen.term().text() + "\"";
        return Optional.of(new AssetDecision(cell.path(), concept.assets().getFirst(), score, route, reason, candidates));
    }

    /** Vị trí của cụm trong chữ đã fold, -1 khi không khớp. */
    private static int find(String text, Term term) {
        String padded = " " + text + " ";
        if (!term.singleWord()) {
            int at = padded.indexOf(" " + term.text() + " ");
            return at < 0 ? -1 : at;
        }
        if (text.equals(term.text())) return 0;
        for (String classifier : CLASSIFIERS) {
            int at = padded.indexOf(" " + classifier + " " + term.text() + " ");
            if (at >= 0) return at + classifier.length() + 1;
        }
        return -1;
    }

    private GameAssetCatalog.Entry entry(String assetId) {
        GameAssetCatalog.Entry entry = catalog.find(assetId);
        // ConceptGraph đã kiểm mọi hình có trong danh mục; tới đây là lỗi lập trình.
        if (entry == null) throw new IllegalStateException("Khái niệm trỏ tới hình không có trong danh mục: " + assetId);
        return entry;
    }
}
