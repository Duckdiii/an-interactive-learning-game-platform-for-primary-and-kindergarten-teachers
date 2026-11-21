package com.aigameplatform.backend.service.asset.concept;

import com.aigameplatform.backend.service.asset.VietnameseText;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Đồ thị khái niệm cho bộ gán hình: khái niệm, nhóm cha, quan hệ dễ nhầm, và các hình của mỗi khái niệm. Nạp từ
 * {@code resources/assets/concepts/*.json} (mỗi nhóm nghĩa một file) và kiểm hợp lệ lúc khởi tạo, nên dữ liệu sai làm app
 * không khởi động thay vì chọn hình sai lúc chạy.
 */
@Component
public class ConceptGraph {

    private static final String PATTERN = "classpath:/assets/concepts/*.json";

    private final Map<String, Concept> byId = new LinkedHashMap<>();
    private final Map<String, List<String>> childrenOf = new LinkedHashMap<>();
    private final Map<String, String> conceptOfAsset = new LinkedHashMap<>();

    @Autowired
    public ConceptGraph(JsonMapper jsonMapper, GameAssetCatalog catalog) {
        this(readAll(jsonMapper), catalog);
    }

    /** Dựng từ các tài liệu JSON đã đọc; dùng trong test để thử dữ liệu sai. */
    ConceptGraph(List<JsonNode> documents, GameAssetCatalog catalog) {
        for (JsonNode document : documents) {
            for (JsonNode node : document.path("concepts")) add(toConcept(node));
        }
        validate(catalog);
        for (Concept concept : byId.values()) {
            if (concept.parent() != null) childrenOf.computeIfAbsent(concept.parent(), key -> new ArrayList<>()).add(concept.id());
            for (String asset : concept.assets()) conceptOfAsset.put(asset, concept.id());
        }
    }

    private static List<JsonNode> readAll(JsonMapper jsonMapper) {
        try {
            List<JsonNode> documents = new ArrayList<>();
            for (Resource resource : new PathMatchingResourcePatternResolver().getResources(PATTERN)) {
                try (InputStream in = resource.getInputStream()) {
                    documents.add(jsonMapper.readTree(in));
                }
            }
            return documents;
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được đồ thị khái niệm: " + PATTERN, e);
        }
    }

    private static Concept toConcept(JsonNode node) {
        String parent = node.path("parent").isMissingNode() || node.path("parent").isNull() ? null : node.path("parent").asString();
        return new Concept(node.path("id").asString(), node.path("labelVi").asString(), parent,
                strings(node.path("synonyms")), strings(node.path("confusableWith")), strings(node.path("assets")));
    }

    private static List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        for (JsonNode value : array) values.add(value.asString());
        return values;
    }

    private void add(Concept concept) {
        if (concept.id().isBlank()) throw invalid("khái niệm thiếu id");
        if (byId.putIfAbsent(concept.id(), concept) != null) throw invalid("id khái niệm trùng: " + concept.id());
    }

    private void validate(GameAssetCatalog catalog) {
        Set<String> seenAssets = new HashSet<>();
        Map<String, String> conceptOfTerm = new HashMap<>();
        for (Concept concept : byId.values()) {
            if (concept.labelVi().isBlank()) throw invalid(concept.id() + " thiếu labelVi");
            if (concept.parent() != null && !byId.containsKey(concept.parent())) {
                throw invalid(concept.id() + " có nhóm cha không tồn tại: " + concept.parent());
            }
            // Cùng một cụm cho hai khái niệm thì bộ gán hình luôn hòa và khái niệm đó không bao giờ ra hình.
            List<String> terms = new ArrayList<>(concept.synonyms());
            terms.add(concept.labelVi());
            for (String term : terms) {
                String owner = conceptOfTerm.putIfAbsent(VietnameseText.fold(term), concept.id());
                if (owner != null && !owner.equals(concept.id())) {
                    throw invalid("cụm \"" + term + "\" thuộc cả " + owner + " và " + concept.id());
                }
            }
            for (String other : concept.confusableWith()) {
                if (other.equals(concept.id())) throw invalid(concept.id() + " dễ nhầm với chính nó");
                Concept target = byId.get(other);
                if (target == null) throw invalid(concept.id() + " dễ nhầm với khái niệm không tồn tại: " + other);
                if (!target.confusableWith().contains(concept.id())) {
                    throw invalid(concept.id() + " dễ nhầm với " + other + " nhưng chiều ngược lại thiếu");
                }
            }
            for (String asset : concept.assets()) {
                if (catalog.find(asset) == null) throw invalid(concept.id() + " trỏ tới hình không có trong danh mục: " + asset);
                // Một hình chỉ thuộc một khái niệm, để biết chắc hình đó nghĩa là gì.
                if (!seenAssets.add(asset)) throw invalid("hình thuộc hai khái niệm: " + asset);
            }
            requireNoCycle(concept);
        }
    }

    private void requireNoCycle(Concept start) {
        Set<String> path = new HashSet<>();
        for (Concept current = start; current != null; current = current.parent() == null ? null : byId.get(current.parent())) {
            if (!path.add(current.id())) throw invalid("nhóm cha tạo vòng tại " + start.id());
        }
    }

    private static IllegalStateException invalid(String message) {
        return new IllegalStateException("Đồ thị khái niệm sai: " + message);
    }

    public Optional<Concept> find(String id) {
        return Optional.ofNullable(id == null ? null : byId.get(id));
    }

    /** Mọi khái niệm, giữ thứ tự trong file. */
    public List<Concept> concepts() {
        return List.copyOf(byId.values());
    }

    /** Khái niệm con trực tiếp. */
    public List<Concept> childrenOf(String id) {
        return childrenOf.getOrDefault(id, List.of()).stream().map(byId::get).toList();
    }

    /** Đi xuống: mọi hình của khái niệm và mọi khái niệm con cháu ("con vật" ra mọi hình con vật). */
    public List<String> assetsUnder(String id) {
        Concept concept = byId.get(id);
        if (concept == null) return List.of();
        List<String> result = new ArrayList<>(concept.assets());
        for (String child : childrenOf.getOrDefault(id, List.of())) result.addAll(assetsUnder(child));
        return result;
    }

    /** Đi ngang: khái niệm cùng nhóm cha, trừ chính nó (để chọn hình nhiễu cùng loại). */
    public List<Concept> siblingsOf(String id) {
        Concept concept = byId.get(id);
        if (concept == null || concept.parent() == null) return List.of();
        return childrenOf(concept.parent()).stream().filter(sibling -> !sibling.id().equals(id)).toList();
    }

    /** Khái niệm của một hình, rỗng khi hình chưa thuộc khái niệm nào (nhóm chưa dựng đồ thị). */
    public Optional<Concept> conceptOf(String assetId) {
        return Optional.ofNullable(assetId == null ? null : conceptOfAsset.get(assetId)).map(byId::get);
    }
}
