package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.GenerationScopeUnsupportedException;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CurriculumCatalogTest {
    @Test
    void controlsDoNotPublishAnExtraScope() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var catalog = new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ));
        assertThat(catalog.requireSupported(GameType.QUIZ, Subject.MATH, GradeLevel.GRADE_1)).isSameAs(dataset);
        assertThatThrownBy(() -> catalog.requireSupported(GameType.QUIZ, Subject.MATH, GradeLevel.GRADE_2))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
        assertThatThrownBy(() -> catalog.requireSupported(GameType.QUIZ, Subject.MATH, GradeLevel.KINDERGARTEN))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
        assertThatThrownBy(() -> catalog.requireSupported(GameType.WORD_SCRAMBLE, Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
    }

    @Test
    void kindergartenCatalogTreatsSubjectAsHintAndPublishesOneAgeBandAgnosticScope() {
        var source = new CurriculumSource("preschool.pdf", "a".repeat(64), "01/VBHN-BGDĐT",
                "kindergarten-outcomes-v1", 84);
        var outcome = "Khám phá các sự vật gần gũi.";
        var chunk = new CurriculumChunk("kg-cognitive-34", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Nhận thức / Khám phá khoa học", outcome, false,
                List.of(new CurriculumChunk.SourceFragment(62, 74, "AGE_3_4", outcome)),
                "COGNITIVE", List.of("SCIENCE_EXPLORATION"), "AGE_3_4");
        var dataset = new CurriculumDataset(source, List.of(chunk));
        var catalog = new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ));

        assertThat(catalog.requireSupported(GameType.QUIZ, Subject.MATH, GradeLevel.KINDERGARTEN)).isSameAs(dataset);
        assertThat(catalog.requireSupported(GameType.QUIZ, Subject.VIETNAMESE, GradeLevel.KINDERGARTEN)).isSameAs(dataset);
        assertThat(catalog.requireSupported(GameType.QUIZ, Subject.ENGLISH, GradeLevel.KINDERGARTEN)).isSameAs(dataset);
    }
}
