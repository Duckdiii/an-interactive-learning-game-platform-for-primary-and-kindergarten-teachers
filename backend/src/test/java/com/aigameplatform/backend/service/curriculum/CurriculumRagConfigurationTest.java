package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

class CurriculumRagConfigurationTest {
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
