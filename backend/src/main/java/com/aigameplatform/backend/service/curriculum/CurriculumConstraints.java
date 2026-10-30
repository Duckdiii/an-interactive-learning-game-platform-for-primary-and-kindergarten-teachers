package com.aigameplatform.backend.service.curriculum;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;

/** Versioned author-supplied capabilities; never inferred from retrieval scores. */
public final class CurriculumConstraints {
    public enum Skill { COUNT, READ_NUMBER, WRITE_NUMBER, PLACE_VALUE, COMPARE, ADD, SUBTRACT,
        ADD_MEANING, SUBTRACT_MEANING, WORD_PROBLEM, POSITION, SQUARE, CIRCLE, TRIANGLE, RECTANGLE,
        CUBE, CUBOID, ASSEMBLE, LENGTH_COMPARE, CM_READ, CM_MEASURE, WEEK, TIME_HOUR, CALENDAR, ESTIMATE }
    public enum Carry { UNSPECIFIED, NO_CARRY, WITH_CARRY }
    public record Capability(Skill skill, Long maxNumber, Carry carry, boolean mental, boolean roundTens, String unit) {
        public Capability {
            if (skill == null || carry == null || (maxNumber != null && maxNumber < 0))
                throw new IllegalArgumentException("Invalid curriculum capability");
        }
    }
    public record Entry(String chunkId, List<Capability> capabilities) {
        public Entry { capabilities = List.copyOf(capabilities); }
    }
    private final Map<String, List<Capability>> byChunk;
    private final String sha256;

    private CurriculumConstraints(Map<String, List<Capability>> entries, String sha) {
        byChunk = Map.copyOf(entries);
        sha256 = sha;
    }
    public int size() { return byChunk.size(); }
    public String sha256() { return sha256; }
    public List<Capability> capabilities(String chunkId) { return byChunk.getOrDefault(chunkId, List.of()); }

    public void requireApproved(String approvedSha256) {
        if (!sha256.equals(approvedSha256))
            throw new IllegalStateException("Curriculum constraints require approval of the exact sidecar SHA-256");
    }

    public static CurriculumConstraints load(CurriculumDataset dataset) throws IOException {
        var mapper = new JsonMapper();
        try (var manifestStream = CurriculumDataset.resource("manifest.json")) {
            var manifest = mapper.readTree(manifestStream);
            if (!dataset.source().datasetVersion().equals(manifest.path("datasetVersion").asString())
                    || !dataset.source().sourceSha256().equals(manifest.path("sourceSha256").asString())
                    || !"math-g1-constraints-v1".equals(manifest.path("constraintsVersion").asString()))
                throw new IllegalStateException("Constraints version or source does not match the dataset");
            String resource = manifest.path("constraintsResource").asString();
            if (!"constraints.jsonl".equals(resource)) throw new IllegalStateException("Unknown constraints resource");
            try (var stream = CurriculumDataset.resource(resource)) {
                return parse(stream.readAllBytes(), manifest.path("constraintsSha256").asString(), dataset);
            }
        }
    }

    static CurriculumConstraints parse(byte[] bytes, String expectedSha, CurriculumDataset dataset) {
        String sha;
        try { sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
        if (!sha.equals(expectedSha)) throw new IllegalStateException("Constraints checksum mismatch");
        var mapper = new JsonMapper();
        var entries = new HashMap<String, List<Capability>>();
        new String(bytes, StandardCharsets.UTF_8).lines().filter(s -> !s.isBlank()).forEach(line -> {
            var entry = mapper.readValue(line, Entry.class);
            if (entry.chunkId() == null || entries.putIfAbsent(entry.chunkId(), entry.capabilities()) != null)
                throw new IllegalStateException("Duplicate or missing constraint chunk ID");
        });
        var expected = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        if (!entries.keySet().equals(expected)) throw new IllegalStateException("Constraints must cover exactly the primary outcomes");
        return new CurriculumConstraints(entries, sha);
    }
}
