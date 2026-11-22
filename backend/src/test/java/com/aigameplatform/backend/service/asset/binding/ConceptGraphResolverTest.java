package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.asset.concept.ConceptGraph;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Chạy trên đồ thị khái niệm và danh mục thật. */
class ConceptGraphResolverTest {

    private final ConceptGraphResolver resolver = new ConceptGraphResolver(
            new ConceptGraph(JsonMapper.builder().build(), GameAssetCatalogFixture.ASSETS), GameAssetCatalogFixture.ASSETS);

    private static CellContext cell(String visualPrompt) {
        return new CellContext("/questions/0", visualPrompt, null, null);
    }

    @Test
    void findsAConceptThroughASynonymTheCatalogDoesNotKnow() {
        AssetDecision decision = resolver.resolve(cell("cún")).orElseThrow();

        assertThat(decision.assetId()).isEqualTo("anim-dog");
        assertThat(decision.route()).isEqualTo("concept");
        assertThat(decision.reason()).contains("animal.dog", "cún");
        assertThat(decision.candidates()).extracting(AssetCandidate::assetId)
                .containsExactly("anim-dog", "kenney-animal-dog", "fluent-animal-dog");
        assertThat(decision.candidates()).extracting(AssetCandidate::family).containsExactly("openmoji", "kenney", "fluent");
        assertThat(decision.candidates()).extracting(AssetCandidate::label).containsOnly("Con chó");
    }

    @Test
    void multiWordSynonymsMatchInsideLongSentences() {
        assertThat(resolver.resolve(cell("Một chú mèo con nằm ngủ trên ghế")).orElseThrow().assetId()).isEqualTo("anim-cat");
        assertThat(resolver.resolve(cell("Hai con gà mái đang mổ thóc ngoài sân")).orElseThrow().assetId())
                .isEqualTo("kenney-animal-chicken");
    }

    @Test
    void singleWordSynonymsDoNotMatchInsideCommonWords() {
        // Chữ đơn nằm trong từ thường, kể cả ở chữ ngắn: không được ra hình con vật.
        assertThat(resolver.resolve(cell("em bé bò trên sàn nhà"))).isEmpty();
        assertThat(resolver.resolve(cell("nêu ý kiến của em"))).isEmpty();
        assertThat(resolver.resolve(cell("một cú đá thật mạnh"))).isEmpty();
        assertThat(resolver.resolve(cell("bé bò"))).isEmpty();
        assertThat(resolver.resolve(cell("kiến thức"))).isEmpty();
        assertThat(resolver.resolve(cell("cá nhân"))).isEmpty();
        assertThat(resolver.resolve(cell("cú sốc"))).isEmpty();
    }

    @Test
    void singleWordSynonymsMatchAloneOrAfterAClassifierInAnySentence() {
        assertThat(resolver.resolve(cell("Chú cún chạy trên cỏ")).orElseThrow().assetId()).isEqualTo("anim-dog");
        assertThat(resolver.resolve(cell("ba con cọp đang ngủ trong hang")).orElseThrow().assetId()).isEqualTo("fluent-animal-tiger");
    }

    @Test
    void overlappingPhrasesOfEqualLengthAreOneNameNotATie() {
        assertThat(resolver.resolve(cell("con gà con")).orElseThrow().assetId()).isEqualTo("kenney-animal-chick");
        assertThat(resolver.resolve(cell("con cá voi phun nước")).orElseThrow().reason()).contains("animal.whale");
    }

    @Test
    void aGroupNameDoesNotHideTheConcreteAnimal() {
        assertThat(resolver.resolve(cell("Con chó là vật nuôi trong nhà")).orElseThrow().assetId()).isEqualTo("anim-dog");
        assertThat(resolver.resolve(cell("con mèo là một con vật nuôi")).orElseThrow().assetId()).isEqualTo("anim-cat");
    }

    @Test
    void marksTheRouteWhenTheQueryCameFromTheCellText() {
        assertThat(resolver.resolve(new CellContext("/pairs/0/left", "", "cún", null)).orElseThrow().route())
                .isEqualTo("concept+text");
    }

    @Test
    void theLongestTermWinsAndAccentsAreKept() {
        assertThat(resolver.resolve(cell("gà con")).orElseThrow().assetId()).isEqualTo("kenney-animal-chick");
        assertThat(resolver.resolve(cell("cọp")).orElseThrow().assetId()).isEqualTo("fluent-animal-tiger");
        // "ông" khác "ong" khi giữ dấu.
        assertThat(resolver.resolve(cell("ông"))).isEmpty();
    }

    @Test
    void yieldsForAGroupWithoutPicturesForATieAndForEmptyText() {
        assertThat(resolver.resolve(cell("con vật dưới nước"))).isEmpty();
        assertThat(resolver.resolve(cell("chú cún và chú cọp"))).isEmpty();
        assertThat(resolver.resolve(cell(""))).isEmpty();
    }
}
