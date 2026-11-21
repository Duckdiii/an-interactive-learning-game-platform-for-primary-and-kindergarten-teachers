package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class NotoEmojiCatalogTest {
    private final NotoEmojiCatalog catalog = new NotoEmojiCatalog();

    @Test
    void eachCatalogEntryHasStableUniqueIdAndARealBundledAsset() {
        var assets = catalog.assets();
        assertThat(assets).hasSize(15);
        assertThat(assets).extracting(NotoEmojiCatalog.Asset::id).doesNotHaveDuplicates();
        assertThat(assets).allSatisfy(asset -> {
            assertThat(asset.label()).isNotBlank();
            assertThat(asset.group()).isNotBlank();
            assertThat(asset.imageUrl()).startsWith("/assets/noto/").endsWith(".svg");
            assertThat(Files.isRegularFile(Path.of("..", "frontend", "public", asset.imageUrl().substring(1)))).isTrue();
        });
    }

    @Test
    void unknownAssetIdDoesNotResolveToAnInventedUrl() {
        assertThat(catalog.find("not-in-catalog")).isEmpty();
        assertThat(catalog.find("cat-face")).get().extracting(NotoEmojiCatalog.Asset::label).isEqualTo("Mèo");
    }
}
