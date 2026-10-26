package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/** One reviewed learning outcome, never a whole circular or an arbitrary character window. */
public record CurriculumChunk(String chunkId, Subject subject, GradeLevel gradeLevel, String topic,
                              String text, boolean control, List<SourceFragment> sourceFragments) {
    public CurriculumChunk {
        if (chunkId == null || !chunkId.matches("[a-z0-9-]+") || subject == null || gradeLevel == null
                || topic == null || topic.isBlank() || text == null || text.isBlank() || text.contains("\uFFFD")
                || sourceFragments == null || sourceFragments.isEmpty()) {
            throw new IllegalArgumentException("A chunk needs scope, text and source fragments");
        }
        sourceFragments = List.copyOf(sourceFragments);
        String fragments = sourceFragments.stream().map(SourceFragment::text).collect(Collectors.joining(" "));
        if (!normalize(text).equals(normalize(fragments))) {
            throw new IllegalArgumentException("Chunk text differs from its source fragments: " + chunkId);
        }
    }

    public record SourceFragment(int pdfPage, int printedPage, String region, String text) {
        public SourceFragment {
            if (pdfPage < 1 || printedPage < 1 || !("RIGHT".equals(region) || "CENTER_RIGHT".equals(region)
                    || "CENTER_LEFT".equals(region) || "LEFT".equals(region) || "VISUAL_RIGHT".equals(region))
                    || text == null || text.isBlank()) {
                throw new IllegalArgumentException("Invalid source fragment");
            }
        }
    }

    public String embeddingId(CurriculumSource source, String model, int dimension) {
        String identity = String.join("|", source.sourceSha256(), source.sourceDocument(), source.curriculumVersion(),
                source.datasetVersion(), chunkId, subject.name(), gradeLevel.name(), Boolean.toString(control),
                model, Integer.toString(dimension), topic, text, sourceFragments.toString());
        return UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)).toString();
    }

    public TextSegment toSegment(CurriculumSource source, String model) {
        Metadata metadata = new Metadata();
        metadata.put("chunkId", chunkId);
        metadata.put("subject", subject.name());
        metadata.put("gradeLevel", gradeLevel.name());
        metadata.put("topic", topic);
        metadata.put("outcomeText", text);
        metadata.put("contentType", control ? "control" : "curriculum_outcome");
        metadata.put("control", Boolean.toString(control));
        metadata.put("sourceDocument", source.sourceDocument());
        metadata.put("sourceSha256", source.sourceSha256());
        metadata.put("sourcePdfPages", sourceFragments.stream().map(f -> Integer.toString(f.pdfPage()))
                .distinct().collect(Collectors.joining(",")));
        metadata.put("sourcePrintedPages", sourceFragments.stream().map(f -> Integer.toString(f.printedPage()))
                .distinct().collect(Collectors.joining(",")));
        metadata.put("curriculumVersion", source.curriculumVersion());
        metadata.put("datasetVersion", source.datasetVersion());
        metadata.put("embeddingModel", model);
        return TextSegment.from("Môn: " + subject + "\nLớp: " + gradeLevel + "\nChủ đề: " + topic
                + "\nYêu cầu cần đạt: " + text, metadata);
    }

    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC)
                .replaceAll("(?m)^\\s*[-–—]\\s*", "")
                .replaceAll("[\\s\\p{Z}]+", "");
    }
}
