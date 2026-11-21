package com.aigameplatform.backend.db;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Chạy Spring Boot trên PostgreSQL thật trong Docker (có pgvector như Supabase), với Flyway và {@code ddl-auto: validate}
 * như khi triển khai. Bổ sung cho profile {@code test} (H2, Flyway tắt), vốn không kiểm được migration và kiểu jsonb.
 */
@SpringBootTest(properties = {
        // Placeholder bắt buộc của application.yml; URL thật do @ServiceConnection cấp.
        "DB_URL=jdbc:postgresql://unused", "DB_USERNAME=unused", "DB_PASSWORD=unused",
        "JWT_SECRET=test-only-signing-key-not-valid-for-any-deployment",
        "app.moderation.required=false", "app.moderation.openai.api-key=",
        "app.curriculum-rag.enabled=false", "app.ai.gemini.game-generation.enabled=false"})
@Import(AbstractPostgresTest.Containers.class)
// Không dùng @EnabledIf: nó không @Inherited nên đặt ở lớp cha không có tác dụng với lớp con (đã thử: điều kiện false vẫn chạy).
@ExtendWith(AbstractPostgresTest.DockerOrCi.class)
public abstract class AbstractPostgresTest {

    /** Máy dev không bật Docker thì bỏ qua; trên CI (CI=true) luôn chạy để thiếu Docker thì đỏ chứ không xanh giả. */
    static class DockerOrCi implements ExecutionCondition {
        @Override
        public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
            if ("true".equals(System.getenv("CI"))) return ConditionEvaluationResult.enabled("CI luôn chạy test Postgres");
            return DockerClientFactory.instance().isDockerAvailable()
                    ? ConditionEvaluationResult.enabled("Có Docker")
                    : ConditionEvaluationResult.disabled("Không có Docker: bỏ qua test Postgres (Testcontainers)");
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    public static class Containers {
        // pg17 khớp Supabase (PostgreSQL 17.6 lúc viết); pgvector vì V1/V5 dùng kiểu vector.
        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer(DockerImageName.parse("pgvector/pgvector:pg17").asCompatibleSubstituteFor("postgres"))
                    .withInitScript("testcontainers/supabase-schemas.sql");
        }
    }
}
