package com.aigameplatform.backend.service.asset;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class VietnameseTextTest {

    @Test
    void stripsAccentsAndTurnsDStrokeIntoD() {
        assertThat(VietnameseText.normalize("Đầu gối")).isEqualTo("dau goi");
        assertThat(VietnameseText.normalize("Quả Táo Đỏ!")).isEqualTo("qua tao do");
        assertThat(VietnameseText.normalize("Thẻ chữ bàn")).isEqualTo("the chu ban");
    }

    @Test
    void decomposedAndComposedSpellingsAreTheSame() {
        String decomposed = "bàn".replace("à", "à");

        assertThat(VietnameseText.normalize(decomposed)).isEqualTo(VietnameseText.normalize("bàn")).isEqualTo("ban");
    }

    @Test
    void collapsesPunctuationAndSpacesAndToleratesNull() {
        assertThat(VietnameseText.normalize("  Từ c... (cân)  ")).isEqualTo("tu c can");
        assertThat(VietnameseText.normalize("3 + 5 = ?")).isEqualTo("3 5");
        assertThat(VietnameseText.normalize(null)).isEmpty();
        assertThat(VietnameseText.normalize("   ")).isEmpty();
    }

    @Test
    void foldKeepsAccentsSoCollidingWordsStayApart() {
        assertThat(VietnameseText.fold("  Thẻ CHỮ Bàn!  ")).isEqualTo("thẻ chữ bàn");
        assertThat(VietnameseText.fold("bàn")).isNotEqualTo(VietnameseText.fold("bạn"));
        assertThat(VietnameseText.fold("đầu")).isNotEqualTo(VietnameseText.fold("dâu"));
        assertThat(VietnameseText.fold("a\u0300")).isEqualTo(VietnameseText.fold("à")); // dạng tách dấu và dạng liền như nhau
        assertThat(VietnameseText.fold(null)).isEmpty();
    }

    @Test
    void knownCollisionsAreKnown() {
        // Đây là lý do danh mục không dùng từ khóa trơ trọi cho các chữ này.
        assertThat(VietnameseText.normalize("đầu")).isEqualTo(VietnameseText.normalize("dâu")).isEqualTo(VietnameseText.normalize("đau"));
        assertThat(VietnameseText.normalize("trong")).isEqualTo(VietnameseText.normalize("trống"));
    }
}
