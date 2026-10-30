package com.aigameplatform.backend.service.curriculum;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiEmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import java.io.IOException;
import java.time.Duration;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.ObjectProvider;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;

/** Spring wiring for the reviewed Math Grade 1 curriculum dataset and its shared PostgreSQL store. */
@Configuration
@ConditionalOnProperty(name = "app.curriculum-rag.enabled", havingValue = "true")
public class CurriculumRagConfiguration {

    @Bean
    @ConditionalOnMissingBean(MeterRegistry.class)
    MeterRegistry curriculumMeterRegistry() { return new SimpleMeterRegistry(); }

    @Bean
    CurriculumMetrics curriculumMetrics(MeterRegistry registry) { return new CurriculumMetrics(registry); }

    @Bean
    CurriculumDataset curriculumDataset() throws IOException {
        return CurriculumDataset.loadDefault();
    }

    @Bean
    CurriculumCatalog curriculumCatalog(CurriculumDataset dataset) {
        return new CurriculumCatalog(java.util.List.of(dataset), java.util.Set.of(com.aigameplatform.backend.entity.enums.GameType.QUIZ));
    }

    @Bean
    @Lazy
    EmbeddingModel curriculumQueryEmbeddingModel(
            @Value("${app.ai.gemini.api-key:}") String apiKey,
            @Value("${app.curriculum-rag.embedding-model:gemini-embedding-001}") String modelName,
            CurriculumMetrics metrics) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is required when curriculum RAG is enabled");
        }
        if (!"gemini-embedding-001".equals(modelName)) {
            throw new IllegalStateException("Curriculum embeddings require gemini-embedding-001 with 768 dimensions");
        }
        var delegate = GoogleAiEmbeddingModel.builder().apiKey(apiKey).modelName(modelName)
                .taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY)
                .outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2)
                .timeout(Duration.ofSeconds(30)).logRequestsAndResponses(false).build();
        return new EmbeddingModel() {
            @Override public dev.langchain4j.model.output.Response<java.util.List<dev.langchain4j.data.embedding.Embedding>> embedAll(
                    java.util.List<TextSegment> segments) {
                return metrics.measure(CurriculumMetrics.Stage.QUERY_EMBEDDING, com.aigameplatform.backend.entity.enums.Subject.MATH,
                        com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, () -> delegate.embedAll(segments),
                        r -> CurriculumMetrics.Outcome.SUCCESS);
            }
        };
    }

    @Bean
    @Lazy
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
    @Lazy
    CurriculumRAGService curriculumRagService(EmbeddingStore<TextSegment> store, EmbeddingModel queryModel,
                                               CurriculumDataset dataset,
                                               @Value("${app.curriculum-rag.embedding-model:gemini-embedding-001}") String modelName,
                                               @Value("${app.curriculum-rag.min-score:0.855}") double minScore) {
        return new CurriculumRAGService(store, queryModel, dataset.source(), modelName,
                RagSpikeConfig.TOP_K, minScore);
    }

    @Bean
    CurriculumContextProvider curriculumContextProvider(CurriculumCatalog catalog, CurriculumDataset dataset,
            ObjectProvider<CurriculumRAGService> retriever, DataSource database,
            @Value("${app.curriculum-rag.embedding-model:gemini-embedding-001}") String model,
            @Value("${app.curriculum-rag.constraints-approved-sha256:}") String approvedSha, CurriculumMetrics metrics) {
        var availability = new CurriculumAvailability(java.time.Clock.systemUTC(), Duration.ofSeconds(30),
                d -> CurriculumSpikeDatabase.requireCompleteDataset(database, d, model));
        return new VerifiedCurriculumContextProvider(catalog, availability, retriever::getObject,
                () -> {
                    try { return CurriculumConstraints.load(dataset); }
                    catch (IOException e) { throw new IllegalStateException("Constraints unavailable"); }
                }, approvedSha, metrics);
    }
}
