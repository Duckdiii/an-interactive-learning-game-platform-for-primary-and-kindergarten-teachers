package com.aigameplatform.backend.service.curriculum;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import dev.langchain4j.store.embedding.pgvector.DefaultMetadataStorageConfig;
import dev.langchain4j.store.embedding.pgvector.MetadataStorageMode;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.sql.DataSource;

final class CurriculumSpikeDatabase {
    static final class LocalEvaluationTargetException extends IllegalArgumentException {
        LocalEvaluationTargetException(String message) { super(message); }
    }

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

    static void requireLocalEvaluationTarget(DataSource database, Path expectedDataDirectory) throws SQLException {
        try (Connection connection = database.getConnection(); Statement statement = connection.createStatement();
             var rows = statement.executeQuery("""
                     SELECT current_database(), inet_server_addr()::text, current_setting('port')::integer,
                            current_setting('data_directory')
                     """)) {
            if (!rows.next()) throw new LocalEvaluationTargetException("Unable to verify local evaluation database identity.");
            requireLocalEvaluationIdentity(rows.getString(1), rows.getString(2), rows.getInt(3), rows.getString(4),
                    expectedDataDirectory);
        }
    }

    static void requireLocalEvaluationIdentity(String databaseName, String serverAddress, int serverPort,
                                              String dataDirectory, Path expectedDataDirectory) {
        Path actualDirectory;
        try {
            actualDirectory = Path.of(dataDirectory).toAbsolutePath().normalize();
        } catch (RuntimeException exception) {
            throw new LocalEvaluationTargetException("Unable to verify local evaluation database identity.");
        }
        Path expectedDirectory = expectedDataDirectory.toAbsolutePath().normalize();
        boolean loopbackServer = isLoopbackAddress(serverAddress);
        if (!"rag_eval".equals(databaseName))
            throw new LocalEvaluationTargetException("Local evaluation requires the dedicated rag_eval database.");
        if (!loopbackServer)
            throw new LocalEvaluationTargetException("Local evaluation database server is not bound to loopback.");
        if (serverPort != 55432)
            throw new LocalEvaluationTargetException("Local evaluation requires the dedicated PostgreSQL port 55432.");
        if (!expectedDirectory.equals(actualDirectory))
            throw new LocalEvaluationTargetException("Database data directory does not match the dedicated local evaluation cluster.");
    }

    private static boolean isLoopbackAddress(String address) {
        if (address == null || address.isBlank()) return false;
        try {
            return InetAddress.getByName(address.split("/", 2)[0]).isLoopbackAddress();
        } catch (UnknownHostException exception) {
            return false;
        }
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
