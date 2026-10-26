package com.aigameplatform.backend.service.curriculum;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiEmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import java.io.IOException;
import java.sql.SQLException;
import java.time.Duration;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Spring wiring for the reviewed Math Grade 1 curriculum dataset and its shared PostgreSQL store. */
@Configuration
@ConditionalOnProperty(name = "app.curriculum-rag.enabled", havingValue = "true")
public class CurriculumRagConfiguration {

    @Bean
    CurriculumDataset curriculumDataset() throws IOException {
        return CurriculumDataset.loadDefault();
    }

    @Bean
    EmbeddingModel curriculumQueryEmbeddingModel(
            @Value("${app.ai.gemini.api-key:}") String apiKey,
            @Value("${app.curriculum-rag.embedding-model:gemini-embedding-001}") String modelName) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is required when curriculum RAG is enabled");
        }
        if (!"gemini-embedding-001".equals(modelName)) {
            throw new IllegalStateException("Curriculum embeddings require gemini-embedding-001 with 768 dimensions");
        }
        return GoogleAiEmbeddingModel.builder().apiKey(apiKey).modelName(modelName)
                .taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY)
                .outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2)
                .timeout(Duration.ofSeconds(30)).logRequestsAndResponses(false).build();
    }

    @Bean
    EmbeddingStore<TextSegment> curriculumEmbeddingStore(DataSource dataSource) {
        return PgVectorEmbeddingStore.datasourceBuilder().datasource(dataSource).table("curriculum_embeddings")
                .dimension(RagSpikeConfig.DIMENSION).createTable(false).dropTableFirst(false).useIndex(false)
                .skipCreateVectorExtension(true)
                .metadataStorageConfig(dev.langchain4j.store.embedding.pgvector.DefaultMetadataStorageConfig.builder()
                        .storageMode(dev.langchain4j.store.embedding.pgvector.MetadataStorageMode.COMBINED_JSONB)
                        .columnDefinitions(java.util.List.of("metadata JSONB NOT NULL")).build())
                .build();
    }

    @Bean
    CurriculumRAGService curriculumRagService(EmbeddingStore<TextSegment> store, EmbeddingModel queryModel,
                                               CurriculumDataset dataset,
                                               DataSource dataSource,
                                               @Value("${app.curriculum-rag.embedding-model:gemini-embedding-001}") String modelName,
                                               @Value("${app.curriculum-rag.min-score:0.855}") double minScore) {
        try {
            CurriculumSpikeDatabase.requireCompleteDataset(dataSource, dataset, modelName);
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not verify the reviewed curriculum embeddings", exception);
        }
        return new CurriculumRAGService(store, queryModel, dataset.source(), modelName,
                RagSpikeConfig.TOP_K, minScore);
    }

    @Bean
    CurriculumContextProvider curriculumContextProvider(CurriculumRAGService retriever) {
        return (topic, subject, grade) -> {
            CurriculumRAGService.RetrievalResult result = retriever.retrieve(topic, subject, grade);
            return result.status() == CurriculumRAGService.Status.FOUND
                    ? CurriculumContextProvider.Evidence.found(result.curriculumContext())
                    : CurriculumContextProvider.Evidence.insufficient();
        };
    }
}
