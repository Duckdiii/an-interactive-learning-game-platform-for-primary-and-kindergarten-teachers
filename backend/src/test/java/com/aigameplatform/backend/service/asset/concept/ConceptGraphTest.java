package com.aigameplatform.backend.service.asset.concept;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ConceptGraphTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameAssetCatalog CATALOG = GameAssetCatalogFixture.ASSETS;
    private final ConceptGraph graph = new ConceptGraph(MAPPER, CATALOG);

    @Test
    void everyAnimalPictureInTheCatalogBelongsToAConcept() {
        // Thêm hình con vật mới vào danh mục mà quên gắn khái niệm thì test này đỏ.
        List<String> missing = CATALOG.entries().stream().filter(entry -> entry.group().equals("animal"))
                .map(GameAssetCatalog.Entry::id).filter(id -> graph.conceptOf(id).isEmpty()).toList();
        assertThat(missing).isEmpty();
        assertThat(graph.assetsUnder("animal")).hasSize((int) CATALOG.entries().stream()
                .filter(entry -> entry.group().equals("animal")).count());
    }

    @Test
    void confusableConceptsAreListedBothWays() {
        for (Concept concept : graph.concepts()) {
            for (String other : concept.confusableWith()) {
                assertThat(graph.find(other).orElseThrow().confusableWith()).as(concept.id() + " và " + other).contains(concept.id());
            }
        }
    }

    @Test
    void walksDownAcrossAndBackFromAPicture() {
        assertThat(graph.assetsUnder("animal.farm")).contains("anim-cat", "fluent-animal-cat", "kenney-animal-dog");
        assertThat(graph.assetsUnder("animal.farm")).doesNotContain("kenney-animal-elephant");
        assertThat(graph.siblingsOf("animal.cat")).extracting(Concept::id).contains("animal.dog").doesNotContain("animal.cat");
        assertThat(graph.childrenOf("animal")).extracting(Concept::id).contains("animal.farm", "animal.wild");
        assertThat(graph.conceptOf("kenney-animal-dog")).map(Concept::id).hasValue("animal.dog");
        assertThat(graph.find("animal.cat").orElseThrow().confusableWith()).contains("animal.tiger");
        // Hình của nhóm chưa dựng đồ thị, hoặc id lạ: không có khái niệm.
        assertThat(graph.conceptOf("fluent-object-balloon")).isEmpty();
        assertThat(graph.conceptOf(null)).isEmpty();
        assertThat(graph.assetsUnder("khong-co")).isEmpty();
        assertThat(graph.siblingsOf("animal")).isEmpty();
    }

    @Test
    void rejectsBrokenGraphsAtStartup() {
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","parent":"khong-co"}]}""", "nhóm cha không tồn tại");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","parent":"b"},{"id":"b","labelVi":"B","parent":"a"}]}""", "vòng");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","assets":["khong-co"]}]}""", "không có trong danh mục");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","assets":["anim-cat"]},{"id":"b","labelVi":"B","assets":["anim-cat"]}]}""",
                "hình thuộc hai khái niệm");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A"},{"id":"a","labelVi":"A2"}]}""", "trùng");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","confusableWith":["khong-co"]}]}""", "dễ nhầm");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","confusableWith":["a"]}]}""", "chính nó");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"A","confusableWith":["b"]},{"id":"b","labelVi":"B"}]}""", "chiều ngược lại");
        assertInvalid("""
                {"concepts":[{"id":"a"}]}""", "thiếu labelVi");
        assertInvalid("""
                {"concepts":[{"id":"a","labelVi":"Con mèo"},{"id":"b","labelVi":"B","synonyms":["con mèo"]}]}""", "thuộc cả");
    }

    private static void assertInvalid(String json, String message) {
        JsonNode document = MAPPER.readTree(json);
        assertThatThrownBy(() -> new ConceptGraph(List.of(document), CATALOG))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining(message);
    }
}
