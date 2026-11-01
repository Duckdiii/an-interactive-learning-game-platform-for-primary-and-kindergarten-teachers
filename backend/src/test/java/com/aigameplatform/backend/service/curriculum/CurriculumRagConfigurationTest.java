package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

class CurriculumRagConfigurationTest {
    @Test void runtimeCatalogSelectsAllPackagedPrimaryDatasetsAndRequiresExplicitPreschoolEnablement() throws Exception {
        var configuration = new CurriculumRagConfiguration();
        var catalog = configuration.curriculumCatalog(false);

        for (var subject : java.util.List.of(com.aigameplatform.backend.entity.enums.Subject.MATH,
                com.aigameplatform.backend.entity.enums.Subject.VIETNAMESE,
                com.aigameplatform.backend.entity.enums.Subject.ENGLISH)) {
            for (var grade : java.util.List.of(com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_2,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_3,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_4,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_5)) {
                assertThat(catalog.requireSupported(com.aigameplatform.backend.entity.enums.GameType.QUIZ, subject, grade)
                        .chunks().stream().filter(chunk -> !chunk.control()).count()).isPositive();
            }
        }
        assertThatThrownBy(() -> catalog.requireSupported(com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                com.aigameplatform.backend.entity.enums.Subject.MATH,
                com.aigameplatform.backend.entity.enums.GradeLevel.KINDERGARTEN))
                .isInstanceOf(com.aigameplatform.backend.exception.GenerationScopeUnsupportedException.class);

        var preschoolCatalog = configuration.curriculumCatalog(true);
        assertThat(preschoolCatalog.requireSupported(com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                com.aigameplatform.backend.entity.enums.Subject.VIETNAMESE,
                com.aigameplatform.backend.entity.enums.GradeLevel.KINDERGARTEN)
                .chunks()).hasSize(134);
    }

    @Test void ragConfigurationDefersCorpusDbAndProviderAccess() {
        var database = mock(DataSource.class);
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test",
                    Map.of("app.curriculum-rag.enabled", "true")));
            context.registerBean(DataSource.class, () -> database);
            context.register(CurriculumRagConfiguration.class);
            assertThatCode(context::refresh).doesNotThrowAnyException();
            assertThat(context.getBean(CurriculumContextProvider.class)).isInstanceOf(VerifiedCurriculumContextProvider.class);
            verifyNoInteractions(database);
        }
    }
}
