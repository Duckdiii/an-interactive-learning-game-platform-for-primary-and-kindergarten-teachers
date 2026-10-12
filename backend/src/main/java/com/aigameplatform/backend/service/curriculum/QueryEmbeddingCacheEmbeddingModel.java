package com.aigameplatform.backend.service.curriculum;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;

/** Persistent local cache for query embeddings; it never caches failed provider calls. */
public final class QueryEmbeddingCacheEmbeddingModel implements EmbeddingModel {
    private final EmbeddingModel delegate;
    private final String modelName;
    private final int dimension;
    private final String taskType;
    private final Path cacheFile;
    private final JsonMapper mapper = new JsonMapper();
    private final Map<String, CacheEntry> entries = new HashMap<>();
    private long cacheHits;
    private long providerMisses;

    public QueryEmbeddingCacheEmbeddingModel(EmbeddingModel delegate, String modelName, int dimension,
                                             String taskType, Path cacheFile) {
        if (delegate == null || modelName == null || modelName.isBlank() || dimension < 1
                || taskType == null || taskType.isBlank() || cacheFile == null) {
            throw new IllegalArgumentException("Query embedding cache requires model, dimension, task type and path");
        }
        this.delegate = delegate;
        this.modelName = modelName;
        this.dimension = dimension;
        this.taskType = taskType;
        this.cacheFile = cacheFile;
        load();
    }

    @Override
    public synchronized Response<List<Embedding>> embedAll(List<TextSegment> segments) {
        var result = new ArrayList<Embedding>(segments.size());
        for (TextSegment segment : segments) {
            String text = segment.text();
            String key = key(text, modelName, dimension, taskType);
            CacheEntry cached = entries.get(key);
            if (cached != null) {
                cacheHits++;
                result.add(toEmbedding(cached.vector()));
                continue;
            }
            Response<List<Embedding>> response = delegate.embedAll(List.of(segment));
            if (response == null || response.content() == null || response.content().size() != 1) {
                throw new IllegalStateException("Embedding provider returned an unexpected query count");
            }
            Embedding embedding = response.content().getFirst();
            if (embedding == null || embedding.vectorAsList().size() != dimension) {
                throw new IllegalStateException("Embedding provider returned a different query vector dimension");
            }
            var entry = new CacheEntry(key, modelName, dimension, taskType, embedding.vectorAsList());
            persist(entry);
            entries.put(key, entry);
            providerMisses++;
            result.add(embedding);
        }
        return Response.from(List.copyOf(result));
    }

    public synchronized long cacheHits() { return cacheHits; }
    public synchronized long providerMisses() { return providerMisses; }

    private void load() {
        if (!Files.exists(cacheFile)) return;
        try {
            for (String line : Files.readAllLines(cacheFile, StandardCharsets.UTF_8)) {
                if (line.isBlank()) continue;
                CacheEntry entry = mapper.readValue(line, CacheEntry.class);
                if (entry.key() == null || !entry.key().matches("[a-f0-9]{64}")
                        || entry.modelName() == null || entry.dimension() < 1 || entry.taskType() == null
                        || entry.vector() == null || entry.vector().size() != entry.dimension()
                        || entry.vector().stream().anyMatch(value -> value == null || !Float.isFinite(value))) {
                    throw new IllegalStateException("Invalid query embedding cache entry");
                }
                if (entry.modelName().equals(modelName) && entry.dimension() == dimension
                        && entry.taskType().equals(taskType)) {
                    CacheEntry previous = entries.putIfAbsent(entry.key(), entry);
                    if (previous != null && !previous.vector().equals(entry.vector())) {
                        throw new IllegalStateException("Conflicting query embedding cache entries");
                    }
                }
            }
        } catch (IOException | RuntimeException exception) {
            if (exception instanceof IllegalStateException stateException) throw stateException;
            throw new IllegalStateException("Could not load query embedding cache", exception);
        }
    }

    private void persist(CacheEntry entry) {
        try {
            Path parent = cacheFile.toAbsolutePath().getParent();
            if (parent != null) Files.createDirectories(parent);
            Files.writeString(cacheFile, mapper.writeValueAsString(entry) + System.lineSeparator(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException | RuntimeException exception) {
            throw new IllegalStateException("Could not persist query embedding cache", exception);
        }
    }

    private static String key(String query, String model, int dimension, String taskType) {
        String material = query + '\u0000' + model + '\u0000' + dimension + '\u0000' + taskType;
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(material.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static Embedding toEmbedding(List<Float> values) {
        float[] vector = new float[values.size()];
        for (int index = 0; index < values.size(); index++) vector[index] = values.get(index);
        return Embedding.from(vector);
    }

    private record CacheEntry(String key, String modelName, int dimension, String taskType, List<Float> vector) { }
}
