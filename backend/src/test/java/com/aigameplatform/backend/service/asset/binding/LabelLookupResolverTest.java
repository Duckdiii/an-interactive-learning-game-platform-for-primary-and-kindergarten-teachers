package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.asset.KeywordAssetRetriever;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import org.junit.jupiter.api.Test;

/** Chạy trên danh mục và bộ khớp thật, không mock. */
class LabelLookupResolverTest {

    private final LabelLookupResolver resolver = new LabelLookupResolver(
            new KeywordAssetRetriever(GameAssetCatalogFixture.ASSETS), GameAssetCatalogFixture.ASSETS);

    private static CellContext cell(String visualPrompt) {
        return new CellContext("/questions/0", visualPrompt, null, null);
    }

    @Test
    void picksTheTopPictureAndKeepsEveryStyleVariantAsACandidate() {
        AssetDecision decision = resolver.resolve(cell("Con chó đang vẫy đuôi")).orElseThrow();

        assertThat(decision.assetId()).isEqualTo("anim-dog");
        assertThat(decision.route()).isEqualTo("label");
        assertThat(decision.reason()).contains("con cho");
        assertThat(decision.score()).isPositive();
        assertThat(decision.candidates()).extracting(AssetCandidate::assetId)
                .contains("anim-dog", "kenney-animal-dog", "fluent-animal-dog");
        assertThat(decision.candidates()).extracting(AssetCandidate::family).contains("openmoji", "kenney", "fluent");
        assertThat(decision.chosen().orElseThrow().label()).isEqualTo("Con chó");
    }

    @Test
    void yieldsWhenNothingMatchesOrTheCellIsEmpty() {
        assertThat(resolver.resolve(cell("zzz qqq"))).isEmpty();
        assertThat(resolver.resolve(cell("   "))).isEmpty();
        assertThat(resolver.resolve(new CellContext("/q", null, null, null))).isEmpty();
    }

    @Test
    void yieldsWhenTwoDifferentConceptsTieBecauseTheTextNamesTwoThings() {
        // "con mèo" và "con chó" cùng 7 ký tự: không đoán, nhường bước sau.
        assertThat(resolver.resolve(cell("con mèo và con chó"))).isEmpty();
    }

    @Test
    void aLongerKeywordStillWinsOverAShorterOne() {
        // "quả bóng bay" chứa "quả bóng": hình bóng bay thắng, không bị coi là hòa.
        assertThat(resolver.resolve(cell("quả bóng bay màu đỏ")).orElseThrow().assetId()).isEqualTo("fluent-object-balloon");
    }

    @Test
    void marksTheRouteWhenTheQueryCameFromTheCellTextInsteadOfTheVisualPrompt() {
        AssetDecision decision = resolver.resolve(new CellContext("/pairs/0/left", "", "Con mèo", null)).orElseThrow();

        assertThat(decision.assetId()).isEqualTo("anim-cat");
        assertThat(decision.route()).isEqualTo("label+text");
    }
}
