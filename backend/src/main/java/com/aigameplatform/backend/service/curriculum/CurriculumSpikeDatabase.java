package com.aigameplatform.backend.service.curriculum;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import dev.langchain4j.store.embedding.pgvector.DefaultMetadataStorageConfig;
import dev.langchain4j.store.embedding.pgvector.MetadataStorageMode;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.sql.DataSource;

final class CurriculumSpikeDatabase {
    private CurriculumSpikeDatabase() { }

    static HikariDataSource connect(RagSpikeConfig config) {
        config.requireDatabase();
        var pool = new HikariConfig();
        pool.setJdbcUrl(config.dbUrl());
        pool.setUsername(config.dbUser());
        pool.setPassword(config.dbPassword());
        // Flyway may hold a metadata connection while acquiring the migration connection.
        pool.setMaximumPoolSize(2);
        pool.setMinimumIdle(0);
        pool.setConnectionTimeout(15_000);
        pool.setInitializationFailTimeout(-1);
        pool.setConnectionInitSql("SET search_path TO public, extensions");
        return new HikariDataSource(pool);
    }

    static PgVectorEmbeddingStore store(DataSource database) {
        return PgVectorEmbeddingStore.datasourceBuilder().datasource(database).table("curriculum_embeddings")
                .dimension(RagSpikeConfig.DIMENSION).createTable(false).dropTableFirst(false).useIndex(false)
                .skipCreateVectorExtension(true)
                .metadataStorageConfig(DefaultMetadataStorageConfig.builder()
                        .storageMode(MetadataStorageMode.COMBINED_JSONB)
                        .columnDefinitions(List.of("metadata JSONB NOT NULL")).build())
                .build();
    }

    static Set<String> knownIds(DataSource database, CurriculumSource source, String model) throws SQLException {
        var result = new HashSet<String>();
        try (var connection = database.getConnection(); var statement = connection.prepareStatement("""
                SELECT embedding_id FROM public.curriculum_embeddings
                WHERE metadata->>'datasetVersion' = ? AND metadata->>'sourceSha256' = ?
                  AND metadata->>'embeddingModel' = ?
                """)) {
            statement.setString(1, source.datasetVersion());
            statement.setString(2, source.sourceSha256());
            statement.setString(3, model);
            try (var rows = statement.executeQuery()) {
                while (rows.next()) result.add(rows.getString(1));
            }
        }
        return Set.copyOf(result);
    }

    static void requireCompleteDataset(DataSource database, CurriculumDataset dataset, String model) throws SQLException {
        var expected = dataset.chunks().stream().map(c -> c.embeddingId(dataset.source(), model, RagSpikeConfig.DIMENSION))
                .collect(java.util.stream.Collectors.toSet());
        if (!knownIds(database, dataset.source(), model).equals(expected))
            throw new IllegalStateException("Dataset is missing or differs from the reviewed corpus; run migrate/ingest first");
    }
}
