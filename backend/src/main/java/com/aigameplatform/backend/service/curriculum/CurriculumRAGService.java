package com.aigameplatform.backend.service.curriculum;

import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;

import com.aigameplatform.backend.entity.enums.GradeLevel;
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
    private final CurriculumSource defaultSource;
    private final CurriculumDatasetCatalog catalog;
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
        this.defaultSource = source;
        this.catalog = null;
        this.modelName = modelName;
        this.topK = topK;
        this.minScore = minScore;
    }

    public CurriculumRAGService(EmbeddingStore<TextSegment> store, EmbeddingModel queryModel,
                                CurriculumDatasetCatalog catalog, String modelName, int topK, double minScore) {
        if (store == null || queryModel == null || catalog == null || modelName == null || modelName.isBlank()
                || topK < 1 || !Double.isFinite(minScore) || minScore < 0 || minScore > 1)
            throw new IllegalArgumentException("Invalid curriculum retriever configuration");
        this.store = store;
        this.queryModel = queryModel;
        this.defaultSource = null;
        this.catalog = catalog;
        this.modelName = modelName;
        this.topK = topK;
        this.minScore = minScore;
    }

    public enum Status { FOUND, INSUFFICIENT_EVIDENCE, UNSUPPORTED_SCOPE }

    public record RetrievedChunk(String chunkId, Subject subject, GradeLevel gradeLevel, String topic, String text,
                                 double score, String sourceDocument, List<Integer> pdfPages,
                                 List<Integer> printedPages, String curriculumVersion) {
        public RetrievedChunk {
            pdfPages = List.copyOf(pdfPages);
            printedPages = List.copyOf(printedPages);
        }
    }

    public record RetrievalResult(Status status, List<RetrievedChunk> chunks, String reasonCode,
                                  List<RetrievedChunk> candidates,
                                  List<CurriculumEvidenceVerifier.EvidenceSupport> evidenceSupports) {
        public RetrievalResult {
            chunks = List.copyOf(chunks);
            candidates = candidates == null ? chunks : List.copyOf(candidates);
            evidenceSupports = evidenceSupports == null ? List.of() : List.copyOf(evidenceSupports);
            reasonCode = reasonCode == null ? "UNSPECIFIED" : reasonCode;
        }

        public RetrievalResult(Status status, List<RetrievedChunk> chunks, String reasonCode,
                               List<RetrievedChunk> candidates) {
            this(status, chunks, reasonCode, candidates, List.of());
        }

        public RetrievalResult(Status status, List<RetrievedChunk> chunks) {
            this(status, chunks, status == Status.FOUND ? "SUPPORTED" : "INSUFFICIENT_EVIDENCE", chunks, List.of());
        }

        public String curriculumContext() {
            return chunks.stream().map(c -> "[" + c.chunkId() + "] " + c.topic() + "\n" + c.text()
                    + "\nNguồn: " + c.sourceDocument() + "; PDF " + c.pdfPages().stream().map(String::valueOf)
                    .collect(Collectors.joining(", ")) + "; trang in " + c.printedPages().stream().map(String::valueOf)
                    .collect(Collectors.joining(", ")) + "; " + c.curriculumVersion())
                    .collect(Collectors.joining("\n\n"));
        }
    }

    public RetrievalResult retrieve(String topic, Subject subject, GradeLevel gradeLevel) {
        if (topic == null || topic.isBlank() || subject == null || gradeLevel == null)
            throw new IllegalArgumentException("Topic, subject and gradeLevel are required");
        CurriculumSource source = defaultSource;
        if (catalog != null) {
            var dataset = catalog.find(subject, gradeLevel);
            if (dataset.isEmpty()) return new RetrievalResult(Status.UNSUPPORTED_SCOPE, List.of());
            source = dataset.get().source();
        }
        final CurriculumSource resolvedSource = source;
        var filter = metadataKey("subject").isEqualTo(subject.name())
                .and(metadataKey("gradeLevel").isEqualTo(gradeLevel.name()))
                .and(metadataKey("contentType").isEqualTo("curriculum_outcome"))
                .and(metadataKey("datasetVersion").isEqualTo(resolvedSource.datasetVersion()))
                .and(metadataKey("curriculumVersion").isEqualTo(resolvedSource.curriculumVersion()))
                .and(metadataKey("sourceSha256").isEqualTo(resolvedSource.sourceSha256()))
                .and(metadataKey("embeddingModel").isEqualTo(modelName))
                .and(metadataKey("control").isEqualTo("false"));
        var retriever = EmbeddingStoreContentRetriever.builder().embeddingStore(store).embeddingModel(queryModel)
                .filter(filter).maxResults(topK).minScore(minScore).build();
        var candidates = retriever.retrieve(Query.from(topic)).stream().map(content -> {
            var metadata = content.textSegment().metadata();
            Subject actualSubject = Subject.valueOf(metadata.getString("subject"));
            GradeLevel actualGrade = GradeLevel.valueOf(metadata.getString("gradeLevel"));
            if (actualSubject != subject || actualGrade != gradeLevel
                    || !resolvedSource.datasetVersion().equals(metadata.getString("datasetVersion"))
                    || !resolvedSource.curriculumVersion().equals(metadata.getString("curriculumVersion"))
                    || !resolvedSource.sourceSha256().equals(metadata.getString("sourceSha256"))
                    || !modelName.equals(metadata.getString("embeddingModel"))
                    || Boolean.parseBoolean(metadata.getString("control"))
                    || !"curriculum_outcome".equals(metadata.getString("contentType"))) {
                throw new IllegalStateException("Embedding store returned a chunk outside the mandatory scope/version");
            }
            return new RetrievedChunk(metadata.getString("chunkId"), actualSubject, actualGrade,
                    metadata.getString("topic"), metadata.getString("outcomeText"),
                    ((Number) content.metadata().get(ContentMetadata.SCORE)).doubleValue(),
                    metadata.getString("sourceDocument"), pages(metadata.getString("sourcePdfPages")),
                    pages(metadata.getString("sourcePrintedPages")), metadata.getString("curriculumVersion"));
        }).toList();
        if (candidates.isEmpty()) {
            return new RetrievalResult(Status.INSUFFICIENT_EVIDENCE, List.of(), "NO_CANDIDATE_EVIDENCE", List.of());
        }
        var decision = new CurriculumEvidenceVerifier().verify(topic, subject, gradeLevel, candidates);
        if (!decision.supported()) {
            return new RetrievalResult(Status.INSUFFICIENT_EVIDENCE, List.of(), decision.reasonCode(), candidates,
                    decision.evidenceSupports());
        }
        var verified = candidates.stream()
                .filter(candidate -> decision.supportingChunkIds().contains(candidate.chunkId())).toList();
        return new RetrievalResult(Status.FOUND, verified, decision.reasonCode(), candidates,
                decision.evidenceSupports());
    }

    private static List<Integer> pages(String pages) {
        return Arrays.stream(pages.split(",")).map(Integer::valueOf).toList();
    }
}
