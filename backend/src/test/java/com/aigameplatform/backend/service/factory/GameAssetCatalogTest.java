package com.aigameplatform.backend.service.factory;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class GameAssetCatalogTest {

    private final GameAssetCatalog catalog = GameAssetCatalogFixture.ASSETS;

    @Test
    void everyUrlPointsToARealFileOfTheFrontend() {
        // Danh mục backend sinh từ ASSET_CATALOG của frontend: id nào trỏ tới file không có thì giáo viên thấy ảnh vỡ.
        Path publicDir = Path.of("..", "frontend", "public");
        assertThat(catalog.urls()).isNotEmpty();
        catalog.urls().forEach((id, url) -> assertThat(publicDir.resolve(url.substring(1))).as(id).isRegularFile());
    }

    @Test
    void entriesCarryGroupFamilyAndKeywordsAndCanBeFoundByIdOrUrl() {
        GameAssetCatalog.Entry carrot = catalog.find(" fluent-food-carrot ");

        assertThat(carrot.group()).isEqualTo("food");
        assertThat(carrot.family()).isEqualTo("fluent");
        assertThat(carrot.keywords()).contains("carrot");
        assertThat(catalog.findByUrl(carrot.url())).isSameAs(carrot);
        assertThat(catalog.findByUrl("/assets/khong-co.svg")).isNull();
        assertThat(catalog.find("khong-co")).isNull();
        assertThat(catalog.entries()).hasSameSizeAs(catalog.urls().keySet()).allSatisfy(entry -> {
            assertThat(entry.group()).as(entry.id()).isNotBlank();
            assertThat(entry.family()).as(entry.id()).isNotBlank();
            assertThat(entry.keywords()).as(entry.id()).isNotEmpty();
        });
    }

    @Test
    void unknownOrBlankIdsGiveNoImage() {
        assertThat(catalog.urlOf("fluent-object-balloon")).isEqualTo("/assets/fluent/object-balloon.svg");
        assertThat(catalog.urlOf(" fluent-object-balloon ")).isEqualTo("/assets/fluent/object-balloon.svg");
        assertThat(catalog.urlOf("khong-co")).isNull();
        assertThat(catalog.urlOf(null)).isNull();
        assertThat(catalog.promptList()).contains("fluent-object-balloon: Bóng bay");
    }

    @Test
    void promptListsEachLabelOnceKeepingTheEntryThatComesFirst() {
        // "Con chó" có ba biến thể phong cách (OpenMoji, Kenney, Fluent): prompt chỉ đưa mục đứng trước.
        String prompt = catalog.promptList();

        assertThat(prompt).contains("anim-dog: Con chó").doesNotContain("kenney-animal-dog", "fluent-animal-dog");
        assertThat(prompt).contains("kenney-animal-elephant: Con voi").doesNotContain("fluent-animal-elephant");
        java.util.List<String> labels = prompt.lines().map(line -> line.substring(line.indexOf(": ") + 2)).toList();
        assertThat(labels).doesNotHaveDuplicates();
        assertThat(catalog.find("fluent-animal-dog")).as("biến thể vẫn có trong danh mục").isNotNull();
    }

    @Test
    void entriesSharingALabelAreTheSameConceptInTheSameGroup() {
        // promptList bỏ mục trùng nhãn: hai hình khác nghĩa mà trùng nhãn (khác nhóm) sẽ mất khỏi prompt mà không báo gì.
        java.util.Map<String, java.util.Set<String>> groupsByLabel = new java.util.HashMap<>();
        catalog.entries().forEach(entry ->
                groupsByLabel.computeIfAbsent(entry.label(), label -> new java.util.HashSet<>()).add(entry.group()));
        groupsByLabel.forEach((label, groups) -> assertThat(groups).as(label).hasSize(1));
    }
}
