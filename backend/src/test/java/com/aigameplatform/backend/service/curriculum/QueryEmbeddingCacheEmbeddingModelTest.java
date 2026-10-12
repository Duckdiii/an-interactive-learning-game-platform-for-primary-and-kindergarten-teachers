package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class QueryEmbeddingCacheEmbeddingModelTest {
    @TempDir Path tempDir;

    @Test
    void persistsQueryVectorsAndReusesThemAfterRestartWithoutCallingTheProviderAgain() throws Exception {
        Path cacheFile = tempDir.resolve("query-embeddings.jsonl");
        AtomicInteger firstProviderCalls = new AtomicInteger();
        var firstRun = new QueryEmbeddingCacheEmbeddingModel(model(firstProviderCalls, 3), "embedding-001", 3,
                "RETRIEVAL_QUERY", cacheFile);

        var original = firstRun.embed("two digit division").content();

        AtomicInteger secondProviderCalls = new AtomicInteger();
        var resumedRun = new QueryEmbeddingCacheEmbeddingModel(model(secondProviderCalls, 3), "embedding-001", 3,
                "RETRIEVAL_QUERY", cacheFile);
        var cached = resumedRun.embed("two digit division").content();

        assertThat(original.vectorAsList()).containsExactlyElementsOf(cached.vectorAsList());
        assertThat(firstProviderCalls).hasValue(1);
        assertThat(secondProviderCalls).hasValue(0);
        assertThat(resumedRun.cacheHits()).isEqualTo(1);
        String cacheJson = java.nio.file.Files.readString(cacheFile);
        assertThat(cacheJson).contains("embedding-001", "RETRIEVAL_QUERY", "\"dimension\":3")
                .doesNotContain("two digit division");
    }

    @Test
    void cacheKeySeparatesModelDimensionAndEmbeddingTaskType() throws Exception {
        Path cacheFile = tempDir.resolve("query-embeddings.jsonl");
        AtomicInteger providerCalls = new AtomicInteger();

        new QueryEmbeddingCacheEmbeddingModel(model(providerCalls, 2), "model-a", 2, "RETRIEVAL_QUERY", cacheFile)
                .embed("same query");
        new QueryEmbeddingCacheEmbeddingModel(model(providerCalls, 2), "model-b", 2, "RETRIEVAL_QUERY", cacheFile)
                .embed("same query");
        new QueryEmbeddingCacheEmbeddingModel(model(providerCalls, 3), "model-a", 3, "RETRIEVAL_QUERY", cacheFile)
                .embed("same query");
        new QueryEmbeddingCacheEmbeddingModel(model(providerCalls, 2), "model-a", 2, "RETRIEVAL_DOCUMENT", cacheFile)
                .embed("same query");

        assertThat(providerCalls).hasValue(4);
        assertThat(java.nio.file.Files.readAllLines(cacheFile)).hasSize(4);
    }

    private static EmbeddingModel model(AtomicInteger calls, int dimension) {
        return new EmbeddingModel() {
            @Override
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                calls.incrementAndGet();
                return Response.from(segments.stream().map(ignored -> {
                    float[] vector = new float[dimension];
                    for (int i = 0; i < dimension; i++) vector[i] = i + 1;
                    return Embedding.from(vector);
                }).toList());
            }
        };
    }
}
