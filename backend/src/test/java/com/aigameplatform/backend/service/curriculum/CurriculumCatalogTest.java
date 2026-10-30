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
}
