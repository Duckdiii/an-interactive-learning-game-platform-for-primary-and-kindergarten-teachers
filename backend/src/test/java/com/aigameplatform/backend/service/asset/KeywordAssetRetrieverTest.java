package com.aigameplatform.backend.service.asset;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Chạy trên danh mục thật (game-asset-catalog.json), nên cũng kiểm luôn từ khóa trong danh mục. */
class KeywordAssetRetrieverTest {

    private final AssetRetriever retriever = new KeywordAssetRetriever(GameAssetCatalogFixture.ASSETS);

    private List<String> ids(String text) {
        return retriever.match(text).stream().map(AssetMatch::assetId).toList();
    }

    private String top(String text) {
        List<AssetMatch> matches = retriever.match(text);
        return matches.isEmpty() ? null : matches.getFirst().assetId();
    }

    @Test
    void findsTheRightPictureForAWordCardWithOrWithoutAccents() {
        assertThat(top("Thẻ chữ bàn")).isEqualTo("custom-object-table");
        assertThat(top("THẺ CHỮ BÀN")).isEqualTo("custom-object-table");
        assertThat(top("cai ban")).isEqualTo("custom-object-table");
        assertThat(top("cái khăn len")).isEqualTo("fluent-clothes-scarf");
    }

    @Test
    void shortWordsThatCollideWithoutAccentsAreToldApartByTheirAccents() {
        // Lỗi thật ở thử nghiệm lần 4: các từ vần "bàn", "khăn", "cân", "chân", "răng" phải ra đúng hình.
        assertThat(top("Từ kh... (khăn)")).isEqualTo("fluent-clothes-scarf");
        assertThat(top("Từ c... (cân)")).isEqualTo("fluent-object-scale");
        assertThat(top("Từ ch... (chân)")).isEqualTo("fluent-body-foot");
        assertThat(top("răng")).isEqualTo("fluent-body-tooth");
        assertThat(top("bàn")).isEqualTo("custom-object-table");
        assertThat(top("dâu")).isEqualTo("fruit-strawberry");
        // Cùng chữ không dấu nhưng khác dấu: không ra hình.
        assertThat(ids("bạn")).doesNotContain("custom-object-table");
        assertThat(ids("bản")).doesNotContain("custom-object-table");
        assertThat(ids("bận")).doesNotContain("custom-object-table");
        assertThat(ids("đau")).doesNotContain("custom-body-head", "fruit-strawberry");
        assertThat(ids("trong")).doesNotContain("fluent-object-drum");
        assertThat(ids("vài")).doesNotContain("custom-body-shoulder");
    }

    @Test
    void aLongerKeywordBeatsAnAccentedShortWordInsideIt() {
        // "đầu gối" chứa từ "đầu" nhưng là đầu gối, không phải cái đầu.
        assertThat(top("đầu gối")).isEqualTo("custom-body-knee");
        assertThat(top("cái đầu")).isEqualTo("custom-body-head");
        assertThat(top("đầu")).isEqualTo("custom-body-head");
    }

    @Test
    void ambiguousShortKeywordsOnlyMatchInShortTextButMentionsIgnoresThatRule() {
        // "cho" là từ khóa của con chó nhưng cũng là từ thường: ở chữ ngắn thì ra hình, ở câu dài thì không.
        assertThat(ids("con cho")).contains("anim-dog");
        assertThat(ids("cho")).contains("anim-dog");
        assertThat(ids("Chọn đáp án cho bé nhé")).doesNotContain("anim-dog");
        // mentions: đã biết hình cần tìm nên vẫn tính là nhắc tới, kể cả trong câu dài.
        assertThat(retriever.mentions("Một con voi đứng cạnh vịt vàng ở bờ sông lớn", "anim-duck")).isTrue();
        assertThat(retriever.mentions("Một con voi đứng cạnh vịt vàng ở bờ sông lớn", "anim-dog")).isFalse();
    }

    @Test
    void theLongestKeywordWins() {
        assertThat(top("Pop the red balloon")).isEqualTo("fluent-object-balloon");
        assertThat(top("quả bóng bay")).isEqualTo("fluent-object-balloon");
        assertThat(top("quả bóng")).isEqualTo("obj-ball");
        assertThat(top("sao Thủy")).isEqualTo("kenney-planet-mercury");
        assertThat(top("ngôi sao")).isEqualTo("obj-star");
        assertThat(top("găng tay")).isEqualTo("fluent-clothes-gloves");
    }

    @Test
    void englishAndVietnameseWordsFindTheSameBodyPartPictures() {
        assertThat(top("head")).isEqualTo("custom-body-head");
        assertThat(top("cái đầu")).isEqualTo("custom-body-head");
        assertThat(top("knees")).isEqualTo("custom-body-knee");
        assertThat(top("đầu gối")).isEqualTo("custom-body-knee");
        assertThat(top("ngón chân")).isEqualTo("custom-body-toe");
    }

    @Test
    void kenneyAnimalsAreFoundThroughTheBackendOnlyKeywords() {
        assertThat(top("con voi")).isEqualTo("kenney-animal-elephant");
        assertThat(top("an elephant")).isEqualTo("kenney-animal-elephant");
        assertThat(top("con heo")).isEqualTo("kenney-animal-pig");
        assertThat(top("hươu cao cổ")).isEqualTo("kenney-animal-giraffe");
    }

    @Test
    void styleVariantsShareTheConceptKeywordsButTheOriginalStaysFirst() {
        // Biến thể (Kenney, Fluent) chép đủ từ khóa của mục gốc: mentions nhận biến thể là đúng hình; khi hòa điểm mục gốc vẫn ra trước.
        assertThat(retriever.mentions("Mèo", "fluent-animal-cat")).isTrue();
        assertThat(retriever.mentions("Chó", "kenney-animal-dog")).isTrue();
        assertThat(retriever.mentions("Quả táo đỏ", "fluent-food-apple")).isTrue();
        assertThat(top("con mèo")).isEqualTo("anim-cat");
        assertThat(top("con chó")).isEqualTo("anim-dog");
        assertThat(top("quả táo")).isEqualTo("fruit-apple");
        assertThat(ids("con chó")).contains("anim-dog", "kenney-animal-dog", "fluent-animal-dog");
    }

    @Test
    void collidingWordsDoNotInventAPicture() {
        assertThat(ids("đau bụng")).isEmpty();
        assertThat(ids("trong lớp học")).isEmpty();
        assertThat(ids("vài bạn nhỏ")).isEmpty();
        assertThat(ids("các bạn học bài")).isEmpty();
        assertThat(ids("hẹn gặp bạn")).isEmpty();
    }

    @Test
    void keywordsMatchWholeWordsOnly() {
        assertThat(ids("cai bang")).doesNotContain("custom-object-table");
        assertThat(ids("mooncakes")).doesNotContain("fluent-food-mooncake");
    }

    @Test
    void emptyOrBlankTextGivesNoMatchAndNeverNull() {
        assertThat(retriever.match(null)).isEmpty();
        assertThat(retriever.match("")).isEmpty();
        assertThat(retriever.match("   ")).isEmpty();
        assertThat(retriever.match("zzz qqq")).isEmpty();
    }

    @Test
    void resultsAreSortedByScoreAndEveryMatchNamesAKnownAsset() {
        List<AssetMatch> matches = retriever.match("con voi và quả bóng bay");

        assertThat(matches).extracting(AssetMatch::score).isSortedAccordingTo(java.util.Comparator.reverseOrder());
        assertThat(matches).allSatisfy(match -> assertThat(GameAssetCatalogFixture.ASSETS.find(match.assetId())).isNotNull());
        assertThat(matches).extracting(AssetMatch::assetId).contains("kenney-animal-elephant", "fluent-object-balloon");
    }
}
