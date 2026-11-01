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

public record CurriculumDataset(CurriculumSource source, List<CurriculumChunk> chunks,
                                List<ManualTranscription> manualTranscriptions) {
    static final String RESOURCE_ROOT = "/curriculum/primary/math-grade1/";
    static final String KINDERGARTEN_RESOURCE_ROOT = "/curriculum/kindergarten/";

    public CurriculumDataset(CurriculumSource source, List<CurriculumChunk> chunks) {
        this(source, chunks, List.of());
    }

    public CurriculumDataset {
        if (source == null || chunks == null || chunks.isEmpty()) {
            throw new IllegalArgumentException("Source and chunks are required");
        }
        chunks = List.copyOf(chunks);
        manualTranscriptions = manualTranscriptions == null ? List.of() : List.copyOf(manualTranscriptions);
        var ids = new HashSet<String>();
        for (var chunk : chunks) {
            if (!ids.add(chunk.chunkId()) || chunk.sourceFragments().stream()
                    .anyMatch(f -> f.pdfPage() > source.pdfPageCount())) {
                throw new IllegalArgumentException("Duplicate ID or invalid page: " + chunk.chunkId());
            }
        }
        var transcriptionKeys = new HashSet<String>();
        for (var transcription : manualTranscriptions) {
            String key = transcription.chunkId() + "|" + transcription.pdfPage() + "|" + transcription.region();
            var chunk = chunks.stream().filter(c -> c.chunkId().equals(transcription.chunkId())).findFirst().orElse(null);
            if (!transcriptionKeys.add(key) || chunk == null || chunk.sourceFragments().stream().noneMatch(fragment ->
                    fragment.pdfPage() == transcription.pdfPage() && fragment.printedPage() == transcription.printedPage()
                            && fragment.region().equals(transcription.region())
                            && CurriculumChunk.normalize(fragment.text()).equals(CurriculumChunk.normalize(transcription.text())))) {
                throw new IllegalArgumentException("Manual transcription must match one declared source fragment: " + key);
            }
        }
    }

    public record ManualTranscription(String chunkId, int pdfPage, int printedPage, String region, String text) {
        public ManualTranscription {
            if (chunkId == null || chunkId.isBlank() || pdfPage < 1 || printedPage < 1 || region == null
                    || region.isBlank() || text == null || text.isBlank()) {
                throw new IllegalArgumentException("Invalid manual transcription");
            }
        }
    }

    public static CurriculumDataset loadDefault() throws IOException {
        var dataset = loadFromResourceRoot(RESOURCE_ROOT);
        var chunks = dataset.chunks();
        if (chunks.stream().filter(c -> !c.control()).anyMatch(c -> c.subject() != Subject.MATH
                || c.gradeLevel() != GradeLevel.GRADE_1)) {
            throw new IllegalStateException("Reviewed elementary corpus scope differs from the manifest");
        }
        return dataset;
    }

    public static CurriculumDataset loadKindergarten() throws IOException {
        var dataset = loadFromResourceRoot(KINDERGARTEN_RESOURCE_ROOT);
        if (dataset.chunks().stream().anyMatch(c -> c.gradeLevel() != GradeLevel.KINDERGARTEN)) {
            throw new IllegalStateException("Kindergarten corpus contains a non-kindergarten outcome");
        }
        return dataset;
    }

    public static CurriculumDataset loadFromResourceRoot(String root) throws IOException {
        var mapper = new JsonMapper();
        try (var manifestStream = resource(root, "manifest.json")) {
            var manifest = mapper.readTree(manifestStream);
            var source = new CurriculumSource(manifest.get("sourceDocument").asString(),
                    manifest.get("sourceSha256").asString(), manifest.get("curriculumVersion").asString(),
                    manifest.get("datasetVersion").asString(), manifest.get("pdfPageCount").asInt());
            var chunks = readLines(root, "chunks.jsonl", CurriculumChunk.class);
            var manualTranscriptions = readOptionalLines(root, "text-transcriptions.jsonl", ManualTranscription.class);
            validateManifestProvenance(manifest, chunks);
            validateManualTranscriptionDeclarations(manifest, manualTranscriptions);
            long primary = chunks.stream().filter(c -> !c.control()).count();
            if (primary != manifest.get("primaryOutcomeCount").asInt()
                    || chunks.size() - primary != manifest.get("controlOutcomeCount").asInt()) {
                throw new IllegalStateException("Reviewed corpus counts or scope differ from the manifest");
            }
            return new CurriculumDataset(source, chunks, manualTranscriptions);
        }
    }

    static void validateManualTranscriptionDeclarations(tools.jackson.databind.JsonNode manifest,
                                                        List<ManualTranscription> transcriptions) {
        var declared = new HashSet<String>();
        var entries = manifest.path("manualTranscriptions");
        if (entries.isArray()) entries.forEach(entry -> declared.add(transcriptionKey(
                entry.path("chunkId").asString(""), entry.path("pdfPage").asInt(),
                entry.path("printedPage").asInt(), entry.path("region").asString(""))));
        var actual = transcriptions.stream().map(t -> transcriptionKey(
                t.chunkId(), t.pdfPage(), t.printedPage(), t.region())).collect(java.util.stream.Collectors.toSet());
        if (declared.size() != (entries.isArray() ? entries.size() : 0) || !declared.equals(actual)) {
            throw new IllegalStateException("Manual transcriptions differ from their manifest declaration");
        }
    }

    private static String transcriptionKey(String chunkId, int pdfPage, int printedPage, String region) {
        return chunkId + "|" + pdfPage + "|" + printedPage + "|" + region;
    }

    static void validateManifestProvenance(tools.jackson.databind.JsonNode manifest, List<CurriculumChunk> chunks) {
        var pdfPages = integerSet(manifest, "pdfPages", "mathGrade1PdfPages");
        var printedPages = integerSet(manifest, "printedPages", "mathGrade1PrintedPages");
        var declaredRegions = new java.util.HashSet<String>();
        var regionsNode = manifest.path("regions");
        if (regionsNode.isArray()) regionsNode.forEach(value -> declaredRegions.add(value.asString()));
        String declaredRegion = manifest.path("region").asString("");
        if (!declaredRegion.isEmpty()) declaredRegions.add(declaredRegion);
        var pageMap = new java.util.HashMap<Integer, Integer>();
        var declaredPageMap = manifest.path("pageMap");
        if (declaredPageMap.isArray()) {
            declaredPageMap.forEach(pair -> pageMap.put(pair.path("pdfPage").asInt(), pair.path("printedPage").asInt()));
        }
        int declaredFragmentCount = manifest.path("sourceFragmentCount").asInt(-1);
        int actualFragmentCount = chunks.stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum();
        if (declaredFragmentCount >= 0 && declaredFragmentCount != actualFragmentCount) {
            throw new IllegalStateException("Manifest source fragment count differs from chunks");
        }
        for (var chunk : chunks) {
            for (var fragment : chunk.sourceFragments()) {
                if (!pdfPages.isEmpty() && !pdfPages.contains(fragment.pdfPage())) {
                    throw new IllegalStateException("Manifest omits PDF page for chunk " + chunk.chunkId());
                }
                if (!printedPages.isEmpty() && !printedPages.contains(fragment.printedPage())) {
                    throw new IllegalStateException("Manifest omits printed page for chunk " + chunk.chunkId());
                }
                if (!pageMap.isEmpty() && !java.util.Objects.equals(pageMap.get(fragment.pdfPage()), fragment.printedPage())) {
                    throw new IllegalStateException("Manifest printed-page mapping differs for chunk " + chunk.chunkId());
                }
                if (!declaredRegions.isEmpty() && !declaredRegions.contains(fragment.region())) {
                    throw new IllegalStateException("Manifest region differs from chunk " + chunk.chunkId());
                }
            }
        }
    }

    private static java.util.Set<Integer> integerSet(tools.jackson.databind.JsonNode manifest, String... names) {
        for (String name : names) {
            var values = manifest.path(name);
            if (values.isArray()) {
                var result = new HashSet<Integer>();
                values.forEach(value -> result.add(value.asInt()));
                return result;
            }
        }
        return java.util.Set.of();
    }

    static <T> List<T> readLines(String name, Class<T> type) throws IOException {
        return readLines(RESOURCE_ROOT, name, type);
    }

    private static <T> List<T> readLines(String root, String name, Class<T> type) throws IOException {
        var mapper = new JsonMapper();
        try (var reader = new BufferedReader(new InputStreamReader(resource(root, name), StandardCharsets.UTF_8))) {
            return reader.lines().filter(line -> !line.isBlank()).map(line -> mapper.readValue(line, type)).toList();
        }
    }

    private static <T> List<T> readOptionalLines(String root, String name, Class<T> type) throws IOException {
        try (var stream = CurriculumDataset.class.getResourceAsStream(root + name)) {
            if (stream == null) return List.of();
        }
        return readLines(root, name, type);
    }

    static InputStream resource(String name) throws IOException {
        return resource(RESOURCE_ROOT, name);
    }

    private static InputStream resource(String root, String name) throws IOException {
        var stream = CurriculumDataset.class.getResourceAsStream(root + name);
        if (stream == null) throw new IOException("Missing reviewed curriculum resource: " + name);
        return stream;
    }
}
