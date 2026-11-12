package com.aigameplatform.backend.service.media;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Curated Noto Emoji 2D assets. IDs and URLs remain stable for saved game drafts. */
@Component
public class NotoEmojiCatalog {
    public record Asset(String id, String label, String group, String imageUrl, String conceptId) { }

    private static Asset asset(String id, String label, String group, String file) {
        return new Asset(id, label, group, "/assets/noto/" + file + ".svg", group.equals("cat") ? "cat" : id);
    }

    private static final List<Asset> ASSETS = List.of(
            asset("cat-face", "Mèo", "cat", "emoji_u1f431"),
            asset("cat-smiling", "Mèo cười", "cat", "emoji_u1f63a"),
            asset("cat-standing", "Mèo đứng", "cat", "emoji_u1f408"),
            asset("dog-face", "Chó", "dog", "emoji_u1f436"),
            asset("apple", "Táo", "fruit", "emoji_u1f34e"),
            asset("banana", "Chuối", "fruit", "emoji_u1f34c"),
            asset("grapes", "Nho", "fruit", "emoji_u1f347"),
            asset("strawberry", "Dâu tây", "fruit", "emoji_u1f353"),
            asset("carrot", "Cà rốt", "vegetable", "emoji_u1f955"),
            asset("car", "Ô tô", "road-transport", "emoji_u1f697"),
            asset("bus", "Xe buýt", "road-transport", "emoji_u1f68c"),
            asset("taxi", "Taxi", "road-transport", "emoji_u1f695"),
            asset("truck", "Xe tải", "road-transport", "emoji_u1f69a"),
            asset("bicycle", "Xe đạp", "road-transport", "emoji_u1f6b2"),
            asset("ship", "Tàu thủy", "water-transport", "emoji_u1f6a2"));

    public List<Asset> assets() { return ASSETS; }

    public Optional<Asset> find(String id) {
        return ASSETS.stream().filter(asset -> asset.id().equals(id)).findFirst();
    }
}
