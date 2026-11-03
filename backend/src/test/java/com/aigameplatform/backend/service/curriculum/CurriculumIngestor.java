package com.aigameplatform.backend.service.curriculum;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import java.util.List;
import java.util.Set;

public final class CurriculumIngestor {
    private static final int BATCH_SIZE = 32;
    private final EmbeddingStore<TextSegment> store;
    private final EmbeddingModel model;
    private final String modelName;
    private final int dimension;

    public CurriculumIngestor(EmbeddingStore<TextSegment> store, EmbeddingModel model, String modelName, int dimension) {
        if (store == null || model == null || modelName == null || modelName.isBlank() || dimension < 1)
            throw new IllegalArgumentException("Store, embedding model and dimensions are required");
        this.store = store;
        this.model = model;
        this.modelName = modelName;
        this.dimension = dimension;
    }

    public record IngestionResult(int written, int skipped, List<String> embeddingIds) { }

    public IngestionResult ingest(CurriculumDataset dataset, Set<String> existingIds) {
        var allIds = dataset.chunks().stream().map(c -> c.embeddingId(dataset.source(), modelName, dimension)).toList();
        var pending = dataset.chunks().stream()
                .filter(c -> !existingIds.contains(c.embeddingId(dataset.source(), modelName, dimension))).toList();
        for (int offset = 0; offset < pending.size(); offset += BATCH_SIZE) {
            var batch = pending.subList(offset, Math.min(offset + BATCH_SIZE, pending.size()));
            var segments = batch.stream().map(c -> c.toSegment(dataset.source(), modelName)).toList();
            var embeddings = model.embedAll(segments).content();
            if (embeddings.size() != batch.size() || embeddings.stream().anyMatch(e -> e.dimension() != dimension
                    || java.util.stream.IntStream.range(0, e.vector().length).anyMatch(i -> !Float.isFinite(e.vector()[i]))
                    || java.util.stream.IntStream.range(0, e.vector().length).allMatch(i -> e.vector()[i] == 0))) {
                throw new IllegalStateException("Embedding count, values or dimensions differ from the store configuration");
            }
            // gemini-embedding-001's reduced vectors need normalization; cosine ranking is unchanged.
            embeddings.forEach(e -> e.normalize());
            var ids = batch.stream().map(c -> c.embeddingId(dataset.source(), modelName, dimension)).toList();
            // Persist each validated batch so a rerun can skip committed IDs after a later failure.
            store.addAll(ids, embeddings, segments);
        }
        return new IngestionResult(pending.size(), dataset.chunks().size() - pending.size(), allIds);
    }
}
