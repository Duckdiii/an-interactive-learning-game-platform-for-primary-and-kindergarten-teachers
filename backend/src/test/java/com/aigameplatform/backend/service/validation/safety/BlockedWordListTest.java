package com.aigameplatform.backend.service.validation.safety;

import static org.assertj.core.api.Assertions.assertThat;

import java.text.Normalizer;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class BlockedWordListTest {

    private final BlockedWordList list = new BlockedWordList(List.of("# chú thích", "", "cứt", "chó đẻ", "Fuck", "sex"));

    @Test
    void findsABlockedWordAndReturnsIt() {
        assertThat(list.findIn("Con cứt")).contains("cứt");
    }

    @Test
    void matchingIgnoresCase() {
        assertThat(list.findIn("FUCK you")).contains("fuck");
    }

    @Test
    void matchesOnWordBoundariesOnly() {
        assertThat(list.findIn("bánh shitake")).isEmpty();
        assertThat(list.findIn("sexy")).isEmpty();
        assertThat(list.findIn("essex")).isEmpty();
    }

    @Test
    void vietnameseDiacriticsMustMatchExactly() {
        assertThat(list.findIn("cứu người")).isEmpty();
        assertThat(list.findIn("cut")).isEmpty();
    }

    @Test
    void decomposedUnicodeIsNormalizedBeforeMatching() {
        String decomposed = Normalizer.normalize("cứt", Normalizer.Form.NFD);

        assertThat(decomposed).isNotEqualTo("cứt");
        assertThat(list.findIn(decomposed)).contains("cứt");
    }

    @Test
    void multiWordTermMatchesAcrossExtraSpaces() {
        assertThat(list.findIn("thằng  chó   đẻ")).contains("chó đẻ");
        assertThat(list.findIn("chó và đẻ")).isEmpty();
    }

    @Test
    void ignoresCommentsAndBlankLines() {
        assertThat(list.findIn("chú thích")).isEmpty();
        assertThat(list.findIn("")).isEmpty();
    }

    @Test
    void cleanTextPasses() {
        assertThat(list.findIn("Con mèo kêu meo meo")).isEmpty();
    }

    @Test
    void theShippedListBlocksProfanityButNotEverydayLessonWords() {
        BlockedWordList shipped = new BlockedWordList(new ClassPathResource("moderation/blocked-words-vi.txt"));

        assertThat(shipped.findIn("địt")).isPresent();
        assertThat(shipped.findIn("porn")).isPresent();
        assertThat(shipped.findIn("Con chó sủa gâu gâu")).isEmpty();
        assertThat(shipped.findIn("Hoa dâm bụt màu đỏ")).isEmpty();
        assertThat(shipped.findIn("Đơn vị đo là dm")).isEmpty();
        assertThat(shipped.findIn("An hang động (cave)")).isEmpty();
        assertThat(shipped.findIn("The donkey is an ass")).isEmpty();
    }
}
