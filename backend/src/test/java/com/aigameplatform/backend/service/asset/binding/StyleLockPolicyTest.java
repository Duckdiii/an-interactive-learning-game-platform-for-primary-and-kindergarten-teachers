package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** Ứng viên dựng từ danh mục thật, nên nhãn và họ là dữ liệu thật của game-asset-catalog.json. */
class StyleLockPolicyTest {

    private static final GameAssetCatalog CATALOG = GameAssetCatalogFixture.ASSETS;
    private final StyleLockPolicy policy = new StyleLockPolicy(true, 0.6);

    /** Ô có hình được chọn và các ứng viên (gồm chính hình được chọn). */
    private static AssetDecision cell(String path, String assetId, String... others) {
        List<AssetCandidate> candidates = Stream.concat(Stream.of(assetId), Stream.of(others)).map(id -> {
            GameAssetCatalog.Entry entry = CATALOG.find(id);
            return new AssetCandidate(id, entry.label(), entry.family(), 5, "k");
        }).toList();
        return new AssetDecision(path, assetId, 5, "label", "khớp", candidates);
    }

    private static List<String> ids(List<AssetDecision> decisions) {
        return decisions.stream().map(AssetDecision::assetId).toList();
    }

    @Test
    void theFamilyCoveringMostCellsIsLockedAndTheRouteSaysSo() {
        List<AssetDecision> result = policy.apply(List.of(
                cell("/q/0", "anim-cat", "fluent-animal-cat"),
                cell("/q/1", "anim-dog", "kenney-animal-dog", "fluent-animal-dog"),
                cell("/q/2", "kenney-animal-elephant", "fluent-animal-elephant")), Set.of());

        assertThat(ids(result)).containsExactly("fluent-animal-cat", "fluent-animal-dog", "fluent-animal-elephant");
        assertThat(result.getFirst().route()).isEqualTo("label+style-lock");
        assertThat(result.getFirst().reason()).contains("khóa họ fluent");
    }

    @Test
    void aCellWithoutTheLockedFamilyTakesTheNextFamilyCoveringMostCells() {
        // kenney phủ 4/5 ô; quả táo không có bản kenney nên lấy fluent (phủ 3) thay vì openmoji (phủ 1).
        List<AssetDecision> result = policy.apply(List.of(
                cell("/q/0", "kenney-animal-walrus"),
                cell("/q/1", "kenney-animal-narwhal"),
                cell("/q/2", "fluent-animal-elephant", "kenney-animal-elephant"),
                cell("/q/3", "fluent-animal-giraffe", "kenney-animal-giraffe"),
                cell("/q/4", "fruit-apple", "fluent-food-apple")), Set.of());

        assertThat(ids(result)).containsExactly("kenney-animal-walrus", "kenney-animal-narwhal", "kenney-animal-elephant",
                "kenney-animal-giraffe", "fluent-food-apple");
        assertThat(result.get(4).reason()).contains("không có bản họ kenney, lấy họ fluent");
        assertThat(result.getFirst().route()).isEqualTo("label");
    }

    @Test
    void cellsKeepingTheAiPictureAreNeverChanged() {
        List<AssetDecision> result = policy.apply(List.of(
                cell("/q/0", "anim-cat", "fluent-animal-cat"),
                cell("/q/1", "anim-dog", "fluent-animal-dog"),
                cell("/q/2", "fruit-apple", "fluent-food-apple"),
                cell("/q/3", "kenney-animal-elephant", "fluent-animal-elephant"),
                cell("/q/4", "kenney-animal-giraffe", "fluent-animal-giraffe")), Set.of("/q/0"));

        assertThat(ids(result)).containsExactly("anim-cat", "fluent-animal-dog", "fluent-food-apple",
                "fluent-animal-elephant", "fluent-animal-giraffe");
    }

    @Test
    void cellsKeepingTheAiPictureCountTowardsTheFamilyOfThatPicture() {
        // Hai ô giữ hình openmoji của AI kéo cả game về openmoji; nếu không đếm chúng thì quả táo giữ bản fluent.
        List<AssetDecision> result = policy.apply(List.of(
                cell("/q/0", "anim-cat", "fluent-animal-cat"),
                cell("/q/1", "anim-dog", "fluent-animal-dog"),
                cell("/q/2", "fluent-food-apple", "fruit-apple")), Set.of("/q/0", "/q/1"));

        assertThat(ids(result)).containsExactly("anim-cat", "anim-dog", "fruit-apple");
    }

    @Test
    void doesNotLockWhenTheLeadingFamilyCoversTooFewCells() {
        List<AssetDecision> cells = List.of(
                cell("/q/0", "kenney-animal-walrus"),
                cell("/q/1", "kenney-animal-narwhal"),
                cell("/q/2", "fruit-apple", "fluent-food-apple"),
                cell("/q/3", "fluent-animal-cat", "anim-cat"));

        // Họ dẫn đầu (kenney) phủ 2/4 = 0,5 < 0,6: giữ nguyên.
        assertThat(policy.apply(cells, Set.of())).isEqualTo(cells);
        // Hạ ngưỡng thì kenney được khóa; quả táo lùi sang họ phủ nhiều tiếp theo, hòa thì theo tên họ (fluent).
        assertThat(ids(new StyleLockPolicy(true, 0.5).apply(cells, Set.of())))
                .containsExactly("kenney-animal-walrus", "kenney-animal-narwhal", "fluent-food-apple", "fluent-animal-cat");
    }

    @Test
    void cellsWithoutAPictureStayEmptyAndAreLeftOutOfTheCoverageCount() {
        AssetDecision none = AssetDecision.none("/q/9", "label", "không khớp", List.of());
        // fluent phủ 3/3 ô có hình; nếu tính cả 3 ô trống thì 3/6 < 0,6 và không khóa.
        List<AssetDecision> result = policy.apply(List.of(
                cell("/q/0", "anim-cat", "fluent-animal-cat"),
                cell("/q/1", "kenney-animal-elephant", "fluent-animal-elephant"),
                cell("/q/2", "kenney-animal-giraffe", "fluent-animal-giraffe"), none, none, none), Set.of());

        assertThat(ids(result)).containsExactly("fluent-animal-cat", "fluent-animal-elephant", "fluent-animal-giraffe",
                null, null, null);
        assertThat(policy.apply(List.of(none), Set.of())).containsExactly(none);
    }

    @Test
    void aTieGoesToTheFamilyChosenByDefaultInMoreCells() {
        // Một ô: openmoji và fluent cùng phủ 1 ô, openmoji đang được chọn nên thắng và không đổi gì.
        assertThat(ids(policy.apply(List.of(cell("/q/0", "anim-cat", "fluent-animal-cat")), Set.of())))
                .containsExactly("anim-cat");
    }

    @Test
    void theResultDoesNotDependOnTheOrderOfCells() {
        List<AssetDecision> cells = new ArrayList<>(List.of(
                cell("/q/0", "kenney-animal-walrus"),
                cell("/q/1", "fluent-animal-elephant", "kenney-animal-elephant"),
                cell("/q/2", "fruit-apple", "fluent-food-apple"),
                cell("/q/3", "anim-dog", "kenney-animal-dog", "fluent-animal-dog")));
        Map<String, String> forward = byPath(policy.apply(cells, Set.of()));
        Collections.reverse(cells);

        assertThat(byPath(policy.apply(cells, Set.of()))).isEqualTo(forward);
    }

    @Test
    void theSwitchTurnsTheLockOffAndBadThresholdsAreRejected() {
        List<AssetDecision> cells = List.of(cell("/q/0", "anim-cat", "fluent-animal-cat"),
                cell("/q/1", "kenney-animal-elephant", "fluent-animal-elephant"));

        assertThat(new StyleLockPolicy(false, 0.6).apply(cells, Set.of())).isEqualTo(cells);
        for (double bad : new double[] {1.5, -0.1, Double.NaN}) {
            assertThatThrownBy(() -> new StyleLockPolicy(true, bad)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(new StyleLockPolicy(true, 0)).isNotNull();
        assertThat(new StyleLockPolicy(true, 1)).isNotNull();
    }

    private static Map<String, String> byPath(List<AssetDecision> decisions) {
        return decisions.stream().collect(Collectors.toMap(AssetDecision::path, AssetDecision::assetId));
    }
}
