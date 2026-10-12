package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import tools.jackson.databind.json.JsonMapper;

public record CurriculumDataset(CurriculumSource source, List<CurriculumChunk> chunks) {
    static final String RESOURCE_BASE = "/curriculum/spike/";
    static final String RESOURCE_ROOT = RESOURCE_BASE + "math-grade1/";

    public CurriculumDataset {
        if (source == null || chunks == null || chunks.isEmpty()) {
            throw new IllegalArgumentException("Source and chunks are required");
        }
        chunks = List.copyOf(chunks);
        var ids = new HashSet<String>();
        for (var chunk : chunks) {
            if (!ids.add(chunk.chunkId()) || chunk.sourceFragments().stream()
                    .anyMatch(f -> f.pdfPage() > source.pdfPageCount())) {
                throw new IllegalArgumentException("Duplicate ID or invalid page: " + chunk.chunkId());
            }
        }
    }

    public static CurriculumDataset loadDefault() throws IOException {
        return loadReviewed(RESOURCE_ROOT);
    }

    public static List<CurriculumDataset> loadAllReviewed() throws IOException {
        var mapper = new JsonMapper();
        try (var catalogStream = resource(RESOURCE_BASE, "catalog.json")) {
            var catalog = mapper.readTree(catalogStream);
            var datasetNames = catalog == null ? null : catalog.get("datasets");
            if (datasetNames == null || !datasetNames.isArray() || datasetNames.isEmpty()) {
                throw new IllegalStateException("Reviewed curriculum catalog must list at least one dataset");
            }
            var datasets = new java.util.ArrayList<CurriculumDataset>();
            var names = new HashSet<String>();
            for (var datasetName : datasetNames) {
                if (!datasetName.isTextual() || !datasetName.asString().matches("[a-z0-9-]+")
                        || !names.add(datasetName.asString())) {
                    throw new IllegalStateException("Reviewed curriculum catalog has an invalid or duplicate dataset name");
                }
                datasets.add(loadReviewed(RESOURCE_BASE + datasetName.asString() + "/"));
            }
            return List.copyOf(datasets);
        }
    }

    private static CurriculumDataset loadReviewed(String resourceRoot) throws IOException {
        var mapper = new JsonMapper();
        try (var manifestStream = resource(resourceRoot, "manifest.json")) {
            var manifest = mapper.readTree(manifestStream);
            var source = new CurriculumSource(manifest.get("sourceDocument").asString(),
                    manifest.get("sourceSha256").asString(), manifest.get("curriculumVersion").asString(),
                    manifest.get("datasetVersion").asString(), manifest.get("pdfPageCount").asInt());
            var chunks = readLines(resourceRoot, "chunks.jsonl", CurriculumChunk.class);
            long primary = chunks.stream().filter(c -> !c.control()).count();
            var scopes = chunks.stream().filter(c -> !c.control())
                    .map(c -> c.subject().name() + "/" + c.gradeLevel().name()).distinct().toList();
            if (primary != manifest.get("primaryOutcomeCount").asInt()
                    || chunks.size() - primary != manifest.get("controlOutcomeCount").asInt()
                    || scopes.size() != 1) {
                throw new IllegalStateException("Reviewed corpus counts or one-scope invariant differ from the manifest");
            }
            return new CurriculumDataset(source, chunks);
        }
    }

    static <T> List<T> readLines(String name, Class<T> type) throws IOException {
        return readLines(RESOURCE_ROOT, name, type);
    }

    static <T> List<T> readLines(String resourceRoot, String name, Class<T> type) throws IOException {
        var mapper = new JsonMapper();
        try (var reader = new BufferedReader(new InputStreamReader(resource(resourceRoot, name), StandardCharsets.UTF_8))) {
            return reader.lines().filter(line -> !line.isBlank()).map(line -> mapper.readValue(line, type)).toList();
        }
    }

    static String resourceRootFor(Subject subject, GradeLevel gradeLevel) {
        if (subject == null || gradeLevel == null || !gradeLevel.name().matches("GRADE_[1-5]")) {
            throw new IllegalArgumentException("Primary subject and grade level are required");
        }
        int grade = Integer.parseInt(gradeLevel.name().substring("GRADE_".length()));
        String directory = switch (subject) {
            case MATH -> "math-grade" + grade;
            case VIETNAMESE -> "vietnamese-grade" + grade;
            case ENGLISH -> grade <= 2 ? "english-grade" + grade + "-familiarization"
                    : "english-grade" + grade + "-foreign-language";
        };
        return RESOURCE_BASE + directory + "/";
    }

    private static InputStream resource(String name) throws IOException {
        return resource(RESOURCE_ROOT, name);
    }

    private static InputStream resource(String resourceRoot, String name) throws IOException {
        var stream = CurriculumDataset.class.getResourceAsStream(resourceRoot + name);
        if (stream == null) throw new IOException("Missing reviewed curriculum resource: " + name);
        return stream;
    }
}
