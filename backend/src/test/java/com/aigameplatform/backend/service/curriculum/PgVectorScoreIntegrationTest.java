package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import dev.langchain4j.store.embedding.pgvector.DefaultMetadataStorageConfig;
import dev.langchain4j.store.embedding.pgvector.MetadataStorageMode;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Uses one-session TEMP storage; never writes the production curriculum table. */
@EnabledIfEnvironmentVariable(named = "RUN_LIVE_RAG_VECTOR_TEST", matches = "true")
class PgVectorScoreIntegrationTest {
    @Test void cosineIsMappedToRelevanceAndScopeIsFilteredBeforeTopK() throws Exception {
        try (var db = CurriculumSpikeDatabase.connect(RagSpikeConfig.from(System.getenv()))) {
            db.setMaximumPoolSize(1);
            String table = "rag_score_test_" + UUID.randomUUID().toString().replace("-", "");
            try (var connection = db.getConnection(); var statement = connection.createStatement()) {
                statement.execute("CREATE TEMP TABLE " + table + " (embedding_id UUID PRIMARY KEY, embedding extensions.vector(768), text TEXT, metadata JSONB)");
            }
            var store = PgVectorEmbeddingStore.datasourceBuilder().datasource(db).table(table).dimension(768)
                    .createTable(false).dropTableFirst(false).useIndex(false).skipCreateVectorExtension(true)
                    .metadataStorageConfig(DefaultMetadataStorageConfig.builder().storageMode(MetadataStorageMode.COMBINED_JSONB)
                            .columnDefinitions(List.of("metadata JSONB NOT NULL")).build()).build();
            float[] aligned = new float[768]; aligned[0] = 1;
            float[] orthogonal = new float[768]; orthogonal[1] = 1;
            float[] opposite = new float[768]; opposite[0] = -1;
            for (float[] vector : List.of(aligned, orthogonal, opposite))
                store.add(Embedding.from(vector), TextSegment.from("fixture", Metadata.from("scope", "primary")));
            store.add(Embedding.from(aligned), TextSegment.from("control", Metadata.from("scope", "other")));
            var matches = store.search(EmbeddingSearchRequest.builder().queryEmbedding(Embedding.from(aligned))
                    .filter(metadataKey("scope").isEqualTo("primary")).maxResults(3).minScore(0.0).build()).matches();
            assertThat(matches).extracting(m -> m.score()).containsExactly(1.0, 0.5, 0.0);
            assertThat(matches).allSatisfy(m -> assertThat(m.embedded().text()).isEqualTo("fixture"));
            assertThat(store.search(EmbeddingSearchRequest.builder().queryEmbedding(Embedding.from(aligned))
                    .filter(metadataKey("scope").isEqualTo("primary")).maxResults(3).minScore(0.855).build()).matches()).hasSize(1);
        }
    }
}
