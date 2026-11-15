package com.aigameplatform.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Mọi migration chạy được trên Postgres trống, và entity khớp schema: context chỉ lên được khi Hibernate
 * {@code ddl-auto: validate} thấy đủ bảng/cột (KNOWN-GAPS #6).
 */
class PostgresMigrationTest extends AbstractPostgresTest {
    @Autowired JdbcTemplate jdbc;

    @Test
    void everyMigrationAppliesOnEmptyPostgres() throws Exception {
        long files = Arrays.stream(new PathMatchingResourcePatternResolver().getResources("classpath:db/migration/V*__*.sql")).count();
        Integer applied = jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success AND type = 'SQL'", Integer.class);
        assertThat(applied).isEqualTo((int) files).isPositive();
    }

    @Test
    void extensionsLiveInSupabaseExtensionsSchema() {
        var schemas = jdbc.queryForList(
                "SELECT e.extname || '@' || n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace", String.class);
        assertThat(schemas).contains("vector@extensions", "uuid-ossp@extensions");
    }
}
