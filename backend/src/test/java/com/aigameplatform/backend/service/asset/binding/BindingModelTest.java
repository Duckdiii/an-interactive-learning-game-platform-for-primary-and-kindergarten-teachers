package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class BindingModelTest {

    @Test
    void bindModeIsReadFromTheConfigValueAndRejectsUnknownValues() {
        assertThat(BindMode.fromProperty("fill-empty")).isEqualTo(BindMode.FILL_EMPTY);
        assertThat(BindMode.fromProperty(" OVERRIDE ")).isEqualTo(BindMode.OVERRIDE);
        assertThat(BindMode.OVERRIDE.property()).isEqualTo("override");
        // Gõ sai cờ thì báo lỗi lúc khởi động, không lặng lẽ chạy chế độ khác.
        assertThatThrownBy(() -> BindMode.fromProperty("overwrite")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> BindMode.fromProperty(null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aCellIsSearchedByItsVisualPromptAndFallsBackToItsOwnText() {
        CellContext withPrompt = new CellContext("/questions/0", " 3 con vịt ", "Con vịt", null);
        assertThat(withPrompt.query()).isEqualTo("3 con vịt");
        assertThat(withPrompt.usesSiblingText()).isFalse();

        CellContext withoutPrompt = new CellContext("/pairs/0/left", "  ", "Con mèo", "anim-cat");
        assertThat(withoutPrompt.query()).isEqualTo("Con mèo");
        assertThat(withoutPrompt.usesSiblingText()).isTrue();

        assertThat(new CellContext("/x", null, null, null).query()).isEmpty();
    }

    @Test
    void aDecisionWithoutAPictureHasNoScoreAndKeepsAnImmutableCopyOfItsCandidates() {
        AssetCandidate cat = new AssetCandidate("anim-cat", "Con mèo", "openmoji", 7, "con meo");
        List<AssetCandidate> candidates = new ArrayList<>(List.of(cat));
        AssetDecision none = AssetDecision.none("/questions/2", "label", "dưới ngưỡng", candidates);
        candidates.clear();

        assertThat(none.hasAsset()).isFalse();
        assertThat(none.score()).isZero();
        assertThat(none.candidates()).hasSize(1);
        assertThat(none.chosen()).isEmpty();
        assertThat(new AssetDecision("/q", "anim-cat", 7, "label", "khớp nhãn", List.of(cat)).chosen()).hasValue(cat);
        assertThatThrownBy(() -> new AssetDecision("/q", null, 5, "label", "x", List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AssetDecision("/q", " ", 5, "label", "x", List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AssetDecision("/q", "anim-cat", -1, "label", "x", List.of(cat)))
                .isInstanceOf(IllegalArgumentException.class);
        // Có hình mà hình đó không nằm trong ứng viên: bước khóa họ không biết họ và nhãn của nó.
        assertThatThrownBy(() -> new AssetDecision("/q", "anim-cat", 7, "label", "x", null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("candidates");
        assertThatThrownBy(() -> new AssetCandidate("", "Con mèo", "openmoji", 1, "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AssetCandidate("anim-cat", "Con mèo", "openmoji", -1, "x"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
