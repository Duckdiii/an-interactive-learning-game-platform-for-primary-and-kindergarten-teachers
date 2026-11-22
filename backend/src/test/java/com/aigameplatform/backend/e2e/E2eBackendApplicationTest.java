package com.aigameplatform.backend.e2e;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.core.type.classreading.MetadataReaderFactory;
import org.springframework.core.type.classreading.SimpleMetadataReaderFactory;

/** Bộ lọc component scan của backend e2e: bỏ lớp test và cấu hình test, giữ AI giả và code main. */
class E2eBackendApplicationTest {
    private final MetadataReaderFactory factory = new SimpleMetadataReaderFactory();
    private final E2eBackendApplication.TestClassExcludeFilter filter = new E2eBackendApplication.TestClassExcludeFilter();

    private boolean excluded(String className) throws Exception {
        return filter.match(factory.getMetadataReader(className), factory);
    }

    @Test
    void excludesTestClassesAndTheirNestedConfigurations() throws Exception {
        assertThat(excluded("com.aigameplatform.backend.service.generation.CurriculumAcceptanceLiveTest$CaptureConfiguration")).isTrue();
        assertThat(excluded("com.aigameplatform.backend.db.AbstractPostgresTest$Containers")).isTrue();
        assertThat(excluded("com.aigameplatform.backend.flow.TeacherFlowVerificationTest")).isTrue();
    }

    @Test
    void keepsFakeAiAndMainCode() throws Exception {
        assertThat(excluded("com.aigameplatform.backend.flow.FakeAiConfiguration")).isFalse();
        assertThat(excluded("com.aigameplatform.backend.service.game.GameService")).isFalse();
    }
}
