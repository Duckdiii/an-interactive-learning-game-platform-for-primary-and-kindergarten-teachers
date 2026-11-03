package com.aigameplatform.backend.service.curriculum;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;

/** Persistent embeddings for synthetic benchmark queries only; never wired into application/runtime beans. */
final class BenchmarkQueryEmbeddingCache implements EmbeddingModel, AutoCloseable {
    private static final JsonMapper JSON = new JsonMapper();
    private record Header(String recordType, String configurationFingerprint, int dimension) { }
    private record VectorRecord(String recordType, String key, float[] vector) { }
    record Stats(long freshVectors, long reusedVectors, long liveApiCalls) { }

    private final EmbeddingModel delegate;
    private final Path path;
    private final String model;
    private final String datasetVersion;
    private final String configuration;
    private final int dimension;
    private final String configurationFingerprint;
    private final Map<String, float[]> vectors = new LinkedHashMap<>();
    private long freshVectors;
    private long reusedVectors;
    private long liveApiCalls;

    BenchmarkQueryEmbeddingCache(EmbeddingModel delegate, Path path, String model, String datasetVersion,
            String configuration, int dimension) throws IOException {
        if (delegate == null || path == null || model == null || model.isBlank() || datasetVersion == null
                || datasetVersion.isBlank() || configuration == null || configuration.isBlank() || dimension < 1)
            throw new IllegalArgumentException("Synthetic query cache configuration is incomplete");
        this.delegate = delegate;
        this.path = path;
        this.model = model;
        this.datasetVersion = datasetVersion;
        this.configuration = configuration;
        this.dimension = dimension;
        this.configurationFingerprint = sha256(String.join("\n", model, datasetVersion, configuration,
                "RETRIEVAL_QUERY", Integer.toString(dimension)));
        load();
    }

    @Override public synchronized Response<List<Embedding>> embedAll(List<TextSegment> segments) {
        var result = new ArrayList<Embedding>(java.util.Collections.nCopies(segments.size(), null));
        var missingSegments = new ArrayList<TextSegment>();
        var missingIndexes = new ArrayList<Integer>();
        var missingKeys = new ArrayList<String>();
        for (int i = 0; i < segments.size(); i++) {
            String key = key(segments.get(i).text());
            float[] cached = vectors.get(key);
            if (cached == null) {
                missingSegments.add(segments.get(i));
                missingIndexes.add(i);
                missingKeys.add(key);
            } else {
                result.set(i, Embedding.from(cached.clone()));
                reusedVectors++;
            }
        }
        if (!missingSegments.isEmpty()) {
            liveApiCalls++;
            var response = delegate.embedAll(List.copyOf(missingSegments));
            if (response == null || response.content() == null || response.content().size() != missingSegments.size())
                throw new IllegalStateException("Gemini returned an unexpected query embedding count");
            for (int i = 0; i < response.content().size(); i++) {
                var embedding = response.content().get(i);
                float[] vector = embedding.vector().clone();
                if (embedding.dimension() != dimension)
                    throw new IllegalStateException("Query embedding dimension does not match cache configuration");
                try {
                    append(JSON.writeValueAsString(new VectorRecord("vector", missingKeys.get(i), vector)));
                } catch (IOException exception) {
                    throw new UncheckedIOException("Cannot persist synthetic query embedding", exception);
                }
                vectors.put(missingKeys.get(i), vector);
                result.set(missingIndexes.get(i), Embedding.from(vector.clone()));
                freshVectors++;
            }
        }
        return Response.from(List.copyOf(result));
    }

    Stats stats() { return new Stats(freshVectors, reusedVectors, liveApiCalls); }

    private void load() throws IOException {
        if (path.toAbsolutePath().getParent() != null) Files.createDirectories(path.toAbsolutePath().getParent());
        if (!Files.exists(path)) {
            append(JSON.writeValueAsString(new Header("header", configurationFingerprint, dimension)));
            return;
        }
        byte[] bytes = Files.readAllBytes(path);
        int validLength = bytes.length;
        if (validLength > 0 && bytes[validLength - 1] != '\n') {
            while (validLength > 0 && bytes[validLength - 1] != '\n') validLength--;
            if (validLength == 0) throw new IllegalStateException("Embedding cache has no complete header");
            try (var channel = FileChannel.open(path, StandardOpenOption.WRITE)) {
                channel.truncate(validLength);
                channel.force(true);
            }
        }
        var lines = new String(bytes, 0, validLength, StandardCharsets.UTF_8).lines().filter(s -> !s.isBlank()).toList();
        if (lines.isEmpty()) throw new IllegalStateException("Embedding cache is empty");
        var header = JSON.readValue(lines.getFirst(), Header.class);
        if (!"header".equals(header.recordType()) || !configurationFingerprint.equals(header.configurationFingerprint())
                || header.dimension() != dimension)
            throw new IllegalStateException("Embedding cache configuration does not match current model/query configuration");
        for (int i = 1; i < lines.size(); i++) {
            var record = JSON.readValue(lines.get(i), VectorRecord.class);
            if (!"vector".equals(record.recordType()) || record.key() == null || record.vector() == null
                    || record.vector().length != dimension)
                throw new IllegalStateException("Embedding cache contains an invalid vector record");
            vectors.put(record.key(), record.vector());
        }
    }

    private String key(String text) {
        return sha256(String.join("\n", model, datasetVersion, configuration, "RETRIEVAL_QUERY",
                Integer.toString(dimension), text));
    }

    private void append(String line) throws IOException {
        byte[] bytes = (line + "\n").getBytes(StandardCharsets.UTF_8);
        try (var channel = FileChannel.open(path, StandardOpenOption.CREATE, StandardOpenOption.WRITE,
                StandardOpenOption.APPEND)) {
            var buffer = ByteBuffer.wrap(bytes);
            while (buffer.hasRemaining()) channel.write(buffer);
            channel.force(true);
        }
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    @Override public void close() { }
}
