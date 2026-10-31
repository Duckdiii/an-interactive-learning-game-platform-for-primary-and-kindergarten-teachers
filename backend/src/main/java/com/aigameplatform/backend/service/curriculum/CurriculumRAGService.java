package com.aigameplatform.backend.service.curriculum;

import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.ContentMetadata;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.rag.query.Query;
import dev.langchain4j.store.embedding.EmbeddingStore;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/** Explicit retrieval allows the same context to be reused across generation retries. */
public final class CurriculumRAGService {
    private final EmbeddingStore<TextSegment> store;
    private final EmbeddingModel queryModel;
    private final CurriculumSource source;
    private final String modelName;
    private final int topK;
    private final double minScore;

    public CurriculumRAGService(EmbeddingStore<TextSegment> store, EmbeddingModel queryModel,
                                CurriculumSource source, String modelName, int topK, double minScore) {
        if (store == null || queryModel == null || source == null || modelName == null || modelName.isBlank()
                || topK < 1 || !Double.isFinite(minScore) || minScore < 0 || minScore > 1)
            throw new IllegalArgumentException("Invalid curriculum retriever configuration");
        this.store = store;
        this.queryModel = queryModel;
        this.source = source;
        this.modelName = modelName;
        this.topK = topK;
        this.minScore = minScore;
    }

    public enum Status { FOUND, INSUFFICIENT_EVIDENCE }

    public record RetrievedChunk(String chunkId, Subject subject, GradeLevel gradeLevel, String topic, String text,
                                 double score, String sourceDocument, List<Integer> pdfPages,
                                 List<Integer> printedPages, String curriculumVersion,
                                 String domain, String subDomain, String ageBand) {
        public RetrievedChunk(String chunkId, Subject subject, GradeLevel gradeLevel, String topic, String text,
                              double score, String sourceDocument, List<Integer> pdfPages,
                              List<Integer> printedPages, String curriculumVersion) {
            this(chunkId, subject, gradeLevel, topic, text, score, sourceDocument, pdfPages, printedPages,
                    curriculumVersion, null, null, null);
        }
        public RetrievedChunk {
            pdfPages = List.copyOf(pdfPages);
            printedPages = List.copyOf(printedPages);
        }
    }

    public record RetrievalResult(Status status, List<RetrievedChunk> chunks, List<RetrievedChunk> suggestions) {
        public RetrievalResult(Status status, List<RetrievedChunk> chunks) { this(status, chunks, List.of()); }
        public RetrievalResult { chunks = List.copyOf(chunks); suggestions = List.copyOf(suggestions); }

        public String curriculumContext() {
            return chunks.stream().map(c -> "[" + c.chunkId() + "] " + c.topic()
                    + (c.domain() == null ? "" : "\nLĩnh vực: " + c.domain() + "; nội dung: " + c.subDomain()
                            + "; độ tuổi phù hợp: " + ageLabel(c.ageBand()))
                    + (c.domain() == null ? "\n" + c.text() : "\nKết quả mong đợi: " + c.text())
                    + "\nNguồn: " + c.sourceDocument() + "; PDF " + c.pdfPages().stream().map(String::valueOf)
                    .collect(Collectors.joining(", ")) + "; trang in " + c.printedPages().stream().map(String::valueOf)
                    .collect(Collectors.joining(", ")) + "; " + c.curriculumVersion())
                    .collect(Collectors.joining("\n\n"));
        }
    }

    public RetrievalResult retrieve(String topic, Subject subject, GradeLevel gradeLevel) {
        if (topic == null || topic.isBlank() || subject == null || gradeLevel == null)
            throw new IllegalArgumentException("Topic, subject and gradeLevel are required");
        var filter = metadataKey("subject").isEqualTo(subject.name())
                .and(metadataKey("gradeLevel").isEqualTo(gradeLevel.name()))
                .and(metadataKey("contentType").isEqualTo("curriculum_outcome"))
                .and(metadataKey("control").isEqualTo("false"))
                .and(metadataKey("datasetVersion").isEqualTo(source.datasetVersion()))
                .and(metadataKey("curriculumVersion").isEqualTo(source.curriculumVersion()))
                .and(metadataKey("sourceSha256").isEqualTo(source.sourceSha256()))
                .and(metadataKey("embeddingModel").isEqualTo(modelName));
        var retriever = EmbeddingStoreContentRetriever.builder().embeddingStore(store).embeddingModel(queryModel)
                .filter(filter).maxResults(topK).minScore(0.0).build();
        var ranked = retriever.retrieve(Query.from(topic)).stream().map(content -> {
            var metadata = content.textSegment().metadata();
            Subject actualSubject = Subject.valueOf(metadata.getString("subject"));
            GradeLevel actualGrade = GradeLevel.valueOf(metadata.getString("gradeLevel"));
            if (actualSubject != subject || actualGrade != gradeLevel
                    || !"false".equals(metadata.getString("control")))
                throw new IllegalStateException("Embedding store returned a chunk outside the mandatory scope");
            return new RetrievedChunk(metadata.getString("chunkId"), actualSubject, actualGrade,
                    metadata.getString("topic"), metadata.getString("outcomeText"),
                    ((Number) content.metadata().get(ContentMetadata.SCORE)).doubleValue(),
                    metadata.getString("sourceDocument"), pages(metadata.getString("sourcePdfPages")),
                    pages(metadata.getString("sourcePrintedPages")), metadata.getString("curriculumVersion"));
        }).toList();
        var chunks = ranked.stream().filter(c -> c.score() >= minScore).toList();
        var suggestions = ranked.stream().limit(3).toList();
        return new RetrievalResult(chunks.isEmpty() ? Status.INSUFFICIENT_EVIDENCE : Status.FOUND, chunks,
                chunks.isEmpty() ? suggestions : List.of());
    }

    /** Preschool retrieval is constrained to the teacher-selected age band before ranking. */
    public RetrievalResult retrieveKindergarten(String topic, Subject subjectHint, CurriculumSource preschoolSource,
                                                KindergartenAgeBand ageBand, int preschoolTopK, double preschoolMinScore) {
        if (topic == null || topic.isBlank() || subjectHint == null || preschoolSource == null
                || ageBand == null || preschoolTopK < 1 || !Double.isFinite(preschoolMinScore)
                || preschoolMinScore < 0 || preschoolMinScore > 1)
            throw new IllegalArgumentException("Invalid kindergarten retrieval request");
        var filter = metadataKey("gradeLevel").isEqualTo(GradeLevel.KINDERGARTEN.name())
                .and(metadataKey("contentType").isEqualTo("curriculum_outcome"))
                .and(metadataKey("control").isEqualTo("false"))
                .and(metadataKey("domain").isEqualTo("COGNITIVE")
                        .or(metadataKey("domain").isEqualTo("LANGUAGE")))
                .and(metadataKey("ageBand").isEqualTo(ageBand.metadataValue()))
                .and(metadataKey("datasetVersion").isEqualTo(preschoolSource.datasetVersion()))
                .and(metadataKey("curriculumVersion").isEqualTo(preschoolSource.curriculumVersion()))
                .and(metadataKey("sourceSha256").isEqualTo(preschoolSource.sourceSha256()))
                .and(metadataKey("embeddingModel").isEqualTo(modelName));
        var retriever = EmbeddingStoreContentRetriever.builder().embeddingStore(store).embeddingModel(queryModel)
                .filter(filter).maxResults(preschoolTopK).minScore(0.0).build();
        var ranked = retriever.retrieve(Query.from(topic)).stream().map(content -> {
            var metadata = content.textSegment().metadata();
            Subject actualSubject = Subject.valueOf(metadata.getString("subject"));
            GradeLevel actualGrade = GradeLevel.valueOf(metadata.getString("gradeLevel"));
            String domain = metadata.getString("domain");
            if (actualGrade != GradeLevel.KINDERGARTEN || !("COGNITIVE".equals(domain) || "LANGUAGE".equals(domain))
                    || !"false".equals(metadata.getString("control"))
                    || !ageBand.metadataValue().equals(metadata.getString("ageBand")))
                throw new IllegalStateException("Embedding store returned a chunk outside the kindergarten curriculum");
            return new RetrievedChunk(metadata.getString("chunkId"), actualSubject, actualGrade,
                    metadata.getString("topic"), metadata.getString("outcomeText"),
                    ((Number) content.metadata().get(ContentMetadata.SCORE)).doubleValue(),
                    metadata.getString("sourceDocument"), pages(metadata.getString("sourcePdfPages")),
                    pages(metadata.getString("sourcePrintedPages")), metadata.getString("curriculumVersion"),
                    domain, metadata.getString("subDomain"), metadata.getString("ageBand"));
        }).toList();
        var chunks = ranked.stream().filter(c -> c.score() >= preschoolMinScore).toList();
        return new RetrievalResult(chunks.isEmpty() ? Status.INSUFFICIENT_EVIDENCE : Status.FOUND, chunks,
                chunks.isEmpty() ? ranked.stream().limit(3).toList() : List.of());
    }

    private static String ageLabel(String ageBand) {
        return switch (ageBand) {
            case "AGE_3_4" -> "3–4 tuổi";
            case "AGE_4_5" -> "4–5 tuổi";
            case "AGE_5_6" -> "5–6 tuổi";
            default -> "độ tuổi mẫu giáo";
        };
    }

    private static List<Integer> pages(String pages) {
        return Arrays.stream(pages.split(",")).map(Integer::valueOf).toList();
    }
}
