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
    static final String RESOURCE_ROOT = "/curriculum/spike/math-grade1/";

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
        var mapper = new JsonMapper();
        try (var manifestStream = resource("manifest.json")) {
            var manifest = mapper.readTree(manifestStream);
            var source = new CurriculumSource(manifest.get("sourceDocument").asString(),
                    manifest.get("sourceSha256").asString(), manifest.get("curriculumVersion").asString(),
                    manifest.get("datasetVersion").asString(), manifest.get("pdfPageCount").asInt());
            var chunks = readLines("chunks.jsonl", CurriculumChunk.class);
            long primary = chunks.stream().filter(c -> !c.control()).count();
            if (primary != manifest.get("primaryOutcomeCount").asInt()
                    || chunks.size() - primary != manifest.get("controlOutcomeCount").asInt()
                    || chunks.stream().filter(c -> !c.control()).anyMatch(c -> c.subject() != Subject.MATH
                    || c.gradeLevel() != GradeLevel.GRADE_1)) {
                throw new IllegalStateException("Reviewed corpus counts or scope differ from the manifest");
            }
            return new CurriculumDataset(source, chunks);
        }
    }

    static <T> List<T> readLines(String name, Class<T> type) throws IOException {
        var mapper = new JsonMapper();
        try (var reader = new BufferedReader(new InputStreamReader(resource(name), StandardCharsets.UTF_8))) {
            return reader.lines().filter(line -> !line.isBlank()).map(line -> mapper.readValue(line, type)).toList();
        }
    }

    static InputStream resource(String name) throws IOException {
        var stream = CurriculumDataset.class.getResourceAsStream(RESOURCE_ROOT + name);
        if (stream == null) throw new IOException("Missing reviewed curriculum resource: " + name);
        return stream;
    }
}
