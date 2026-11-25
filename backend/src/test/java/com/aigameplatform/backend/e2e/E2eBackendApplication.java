package com.aigameplatform.backend.e2e;

import com.aigameplatform.backend.AigameBackendApplication;
import com.aigameplatform.backend.db.AbstractPostgresTest;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.util.List;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.MetadataReaderFactory;

/**
 * Backend cho e2e Playwright ({@code frontend/e2e}): app thật trên Postgres của Testcontainers, AI giả
 * ({@code flow.FakeAiConfiguration}, profile {@code verify-flow}), cấu hình ở {@code application-e2e.yml} (cổng 18080).
 * Chạy: {@code ./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.aigameplatform.backend.e2e.E2eBackendApplication}.
 * Nằm trong src/test nên không có trong bản build chạy thật.
 */
public final class E2eBackendApplication {
    private E2eBackendApplication() {
    }

    public static void main(String[] args) {
        new SpringApplicationBuilder(AigameBackendApplication.class, AbstractPostgresTest.Containers.class, MediaStub.class)
                .profiles("e2e", "verify-flow")
                .initializers(context -> context.getBeanFactory()
                        .registerSingleton(TestClassExcludeFilter.class.getName(), new TestClassExcludeFilter()))
                .run(args);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class MediaStub {
        @Bean
        @Primary
        OpenAiModerationClient e2eMediaModeration() {
            return new OpenAiModerationClient("http://localhost", "", "e2e", 1) {
                @Override
                public ModerationResult moderateImage(byte[] bytes, String mimeType) {
                    return new ModerationResult(false, List.of());
                }
            };
        }
    }

    /**
     * Component scan của app thấy cả classpath test: bỏ lớp test (tên kết thúc bằng Test/Tests) và mọi lớp lồng bên trong,
     * gồm các {@code @TestConfiguration} lồng (TestTypeExcludeFilter của Spring Boot không public).
     * shortcut: lọc theo tên lớp ngoài cùng, nên một @TestConfiguration đứng riêng (không nằm trong lớp *Test) vẫn bị scan;
     * khi có lớp như vậy thì thêm điều kiện theo annotation và test cho nó.
     */
    static final class TestClassExcludeFilter extends TypeExcludeFilter {
        @Override
        public boolean match(MetadataReader reader, MetadataReaderFactory factory) {
            String name = reader.getClassMetadata().getClassName();
            String topLevel = name.contains("$") ? name.substring(0, name.indexOf('$')) : name;
            return topLevel.endsWith("Test") || topLevel.endsWith("Tests");
        }

        @Override
        public boolean equals(Object other) {
            return other != null && other.getClass() == getClass();
        }

        @Override
        public int hashCode() {
            return getClass().hashCode();
        }
    }
}
