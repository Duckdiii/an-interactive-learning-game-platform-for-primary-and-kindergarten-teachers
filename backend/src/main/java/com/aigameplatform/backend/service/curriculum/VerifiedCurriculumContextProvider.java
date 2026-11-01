package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.*;
import java.util.Objects;
import java.util.function.Supplier;

/** Only verified primary outcomes may cross the boundary into generation. */
public final class VerifiedCurriculumContextProvider implements CurriculumContextProvider {
    private final CurriculumCatalog catalog;
    private final CurriculumAvailability availability;
    private final Supplier<CurriculumRAGService> retrieval;
    private final Supplier<CurriculumConstraints> constraints;
    private final String approvedSha;
    private final CurriculumMetrics metrics;
    private final String embeddingModel;
    private final int kindergartenTopK;
    private final double kindergartenMinScore;
    private final Supplier<KindergartenEvidenceVerifier> kindergartenEvidenceVerifier;
    private final Supplier<SemanticCurriculumEvidenceVerifier> semanticEvidenceVerifier;
    private volatile CurriculumConstraints loaded;
    private final CurriculumTopicParser parser = new CurriculumTopicParser();
    private final CurriculumEvidenceVerifier verifier = new CurriculumEvidenceVerifier();
    private final CurriculumRejectionGuidance guidance = new CurriculumRejectionGuidance();

    public VerifiedCurriculumContextProvider(CurriculumCatalog catalog, CurriculumAvailability availability,
            Supplier<CurriculumRAGService> retrieval, Supplier<CurriculumConstraints> constraints, String approvedSha) {
        this(catalog, availability, retrieval, constraints, approvedSha, CurriculumMetrics.noop());
    }

    public VerifiedCurriculumContextProvider(CurriculumCatalog catalog, CurriculumAvailability availability,
            Supplier<CurriculumRAGService> retrieval, Supplier<CurriculumConstraints> constraints, String approvedSha,
            CurriculumMetrics metrics) {
        this(catalog, availability, retrieval, constraints, approvedSha, metrics, "UNKNOWN");
    }

    public VerifiedCurriculumContextProvider(CurriculumCatalog catalog, CurriculumAvailability availability,
            Supplier<CurriculumRAGService> retrieval, Supplier<CurriculumConstraints> constraints, String approvedSha,
            CurriculumMetrics metrics, String embeddingModel) {
        this(catalog, availability, retrieval, constraints, approvedSha, metrics, embeddingModel, 8, 0.50);
    }

    public VerifiedCurriculumContextProvider(CurriculumCatalog catalog, CurriculumAvailability availability,
            Supplier<CurriculumRAGService> retrieval, Supplier<CurriculumConstraints> constraints, String approvedSha,
            CurriculumMetrics metrics, String embeddingModel, int kindergartenTopK, double kindergartenMinScore) {
        this(catalog, availability, retrieval, constraints, approvedSha, metrics, embeddingModel,
                kindergartenTopK, kindergartenMinScore, () -> null);
    }

    public VerifiedCurriculumContextProvider(CurriculumCatalog catalog, CurriculumAvailability availability,
            Supplier<CurriculumRAGService> retrieval, Supplier<CurriculumConstraints> constraints, String approvedSha,
            CurriculumMetrics metrics, String embeddingModel, int kindergartenTopK, double kindergartenMinScore,
            Supplier<KindergartenEvidenceVerifier> kindergartenEvidenceVerifier) {
        this(catalog, availability, retrieval, constraints, approvedSha, metrics, embeddingModel,
                kindergartenTopK, kindergartenMinScore, kindergartenEvidenceVerifier, () -> null);
    }

    public VerifiedCurriculumContextProvider(CurriculumCatalog catalog, CurriculumAvailability availability,
            Supplier<CurriculumRAGService> retrieval, Supplier<CurriculumConstraints> constraints, String approvedSha,
            CurriculumMetrics metrics, String embeddingModel, int kindergartenTopK, double kindergartenMinScore,
            Supplier<KindergartenEvidenceVerifier> kindergartenEvidenceVerifier,
            Supplier<SemanticCurriculumEvidenceVerifier> semanticEvidenceVerifier) {
        this.catalog = Objects.requireNonNull(catalog);
        this.availability = Objects.requireNonNull(availability);
        this.retrieval = Objects.requireNonNull(retrieval);
        this.constraints = Objects.requireNonNull(constraints);
        this.approvedSha = approvedSha;
        this.metrics = Objects.requireNonNull(metrics);
        this.embeddingModel = Objects.requireNonNull(embeddingModel);
        if (kindergartenTopK < 1 || !Double.isFinite(kindergartenMinScore)
                || kindergartenMinScore < 0 || kindergartenMinScore > 1)
            throw new IllegalArgumentException("Invalid kindergarten retrieval configuration");
        this.kindergartenTopK = kindergartenTopK;
        this.kindergartenMinScore = kindergartenMinScore;
        this.kindergartenEvidenceVerifier = Objects.requireNonNull(kindergartenEvidenceVerifier);
        this.semanticEvidenceVerifier = Objects.requireNonNull(semanticEvidenceVerifier);
    }

    @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade) {
        return retrieve(topic, subject, grade, null);
    }

    @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade,
                                      KindergartenAgeBand kindergartenAgeBand) {
        return retrieve(topic, subject, grade, kindergartenAgeBand, null);
    }

    @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade,
            KindergartenAgeBand kindergartenAgeBand, String domain) {
        if (domain != null && (grade != GradeLevel.KINDERGARTEN
                || !java.util.Set.of("COGNITIVE", "LANGUAGE").contains(domain)))
            throw new IllegalArgumentException("Domain must be COGNITIVE or LANGUAGE for kindergarten");
        if (topic == null || topic.isBlank())
            throw new CurriculumClarificationRequiredException("Cần mô tả mục tiêu học tập cụ thể.");
        if (grade == GradeLevel.KINDERGARTEN && kindergartenAgeBand == null)
            throw new KindergartenAgeBandRequiredException();
        if (grade != GradeLevel.KINDERGARTEN && kindergartenAgeBand != null)
            throw new IllegalArgumentException("Age band may only be supplied for kindergarten");
        var dataset = catalog.requireSupported(GameType.QUIZ, subject, grade);
        try {
            if (grade == GradeLevel.KINDERGARTEN) {
                SemanticCurriculumEvidenceVerifier semanticVerifier = semanticEvidenceVerifier.get();
                KindergartenEvidenceVerifier legacyVerifier = kindergartenEvidenceVerifier.get();
                if (semanticVerifier == null && legacyVerifier == null)
                    throw new CurriculumServiceUnavailableException(
                            "Curriculum RAG mầm non đang khóa cho tới khi có bộ xác minh căn cứ theo lĩnh vực và duyệt chuyên môn.", null);
                availability.requireReady(dataset);
                int ageOutcomeCount = (int) dataset.chunks().stream().filter(c -> !c.control())
                        .filter(c -> kindergartenAgeBand.metadataValue().equals(c.ageBand()))
                        .filter(c -> domain == null || domain.equals(c.domain()))
                        .filter(c -> "COGNITIVE".equals(c.domain()) || "LANGUAGE".equals(c.domain())).count();
                var candidates = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, subject, grade,
                        () -> retrieval.get().retrieveKindergarten(topic, subject, dataset.source(), kindergartenAgeBand,
                                Math.max(kindergartenTopK, ageOutcomeCount), 0, domain), r -> r.chunks().isEmpty()
                                ? CurriculumMetrics.Outcome.REJECTED : CurriculumMetrics.Outcome.SUCCESS);
                requirePackagedCandidates(dataset, candidates.chunks());
                if (candidates.chunks().isEmpty())
                    throw new CurriculumEvidenceNotFoundException(kindergartenGuidance(candidates.suggestions()));
                var supportedIds = semanticVerifier != null
                        ? requireSemanticDecision(semanticVerifier.verify(topic, subject, grade, kindergartenAgeBand,
                                candidates.chunks()), candidates.chunks())
                        : legacyVerifier.supportedChunkIds(topic, kindergartenAgeBand, candidates.chunks());
                if (supportedIds == null || supportedIds.isEmpty())
                    throw new CurriculumEvidenceNotFoundException(kindergartenGuidance(candidates.chunks()));
                var candidateIds = candidates.chunks().stream().map(CurriculumRAGService.RetrievedChunk::chunkId)
                        .collect(java.util.stream.Collectors.toSet());
                if (!candidateIds.containsAll(supportedIds))
                    throw new IllegalStateException("Kindergarten verifier returned a chunk outside retrieved candidates");
                var supportedChunks = candidates.chunks().stream().filter(c -> supportedIds.contains(c.chunkId())).toList();
                if (supportedChunks.stream().anyMatch(c -> !kindergartenAgeBand.metadataValue().equals(c.ageBand())))
                    throw new IllegalStateException("Kindergarten verifier returned evidence for another age band");
                var context = supportedChunks.stream().map(c -> "[" + c.chunkId() + "] " + c.topic()
                        + "\nKết quả mong đợi: " + c.text() + "\nĐộ tuổi phù hợp: " + ageLabel(c.ageBand()) + "\nDomain: " + c.domain() + "; subDomain: " + c.subDomain()
                        + "\nNguồn: " + c.sourceDocument() + "; PDF " + c.pdfPages()
                        + "; trang in " + c.printedPages() + "; " + c.curriculumVersion())
                        .collect(java.util.stream.Collectors.joining("\n\n"));
                return Evidence.found(provenanceContext(context, dataset),
                        com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(
                                dataset.source(), embeddingModel, supportedChunks));
            }
            if (subject != Subject.MATH || grade != GradeLevel.GRADE_1) {
                return retrieveSemantically(topic, subject, grade, dataset);
            }
            var capabilities = loaded;
            if (capabilities == null) { capabilities = constraints.get(); loaded = capabilities; }
            capabilities.requireApproved(approvedSha);
            availability.requireReady(dataset);
            var parsed = parser.parse(topic);
            if (parsed.needsClarification()) {
                // A bounded grammar's inability to parse natural language is not a curriculum decision.
                if (semanticEvidenceVerifier.get() != null)
                    return retrieveSemantically(topic, subject, grade, dataset);
                var checked = capabilities;
                var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                        () -> verifier.verify(parsed, java.util.List.of(), checked), d -> CurriculumMetrics.Outcome.REJECTED);
                throw new CurriculumEvidenceNotFoundException(guidance.message(decision, dataset, java.util.List.of()));
            }
            var candidates = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, subject, grade,
                    () -> retrieval.get().retrieve(topic, subject, grade), r -> r.chunks().isEmpty()
                            ? CurriculumMetrics.Outcome.REJECTED : CurriculumMetrics.Outcome.SUCCESS);
            var checked = capabilities;
            requirePackagedCandidates(dataset, candidates.chunks());
            var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                    () -> verifier.verify(parsed, candidates.chunks(), checked), d -> d.status() == CurriculumEvidenceVerifier.Status.SUPPORTED
                            ? CurriculumMetrics.Outcome.SUCCESS : CurriculumMetrics.Outcome.REJECTED);
            if (decision.status() != CurriculumEvidenceVerifier.Status.SUPPORTED)
                throw new CurriculumEvidenceNotFoundException(guidance.message(decision, dataset,
                        candidates.chunks().isEmpty() ? candidates.suggestions() : candidates.chunks()));
            var selected = candidates.chunks().stream().filter(c -> decision.supportedChunkIds().contains(c.chunkId())).toList();
            return Evidence.found(provenanceContext(new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND, selected).curriculumContext(), dataset),
                    com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(dataset.source(), embeddingModel, selected));
        } catch (CurriculumEvidenceNotFoundException | CurriculumClarificationRequiredException
                 | CurriculumServiceUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new CurriculumServiceUnavailableException(
                    "Không truy xuất được căn cứ chương trình; vui lòng thử lại sau.", exception);
        }
    }

    private String provenanceContext(String context, CurriculumDataset dataset) {
        return context + "\n\nProvenance: sourceSha256=" + dataset.source().sourceSha256()
                + "; datasetVersion=" + dataset.source().datasetVersion() + "; embeddingModel=" + embeddingModel;
    }

    private Evidence retrieveSemantically(String topic, Subject subject, GradeLevel grade, CurriculumDataset dataset) {
        availability.requireReady(dataset);
        var semanticVerifier = semanticEvidenceVerifier.get();
        if (semanticVerifier == null)
            throw new CurriculumServiceUnavailableException("Chưa cấu hình bộ xác minh ngữ nghĩa cho phạm vi chương trình này.", null);
        int outcomeCount = (int) dataset.chunks().stream().filter(c -> !c.control()).count();
        var candidates = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, subject, grade,
                () -> retrieval.get().retrieve(topic, subject, grade, dataset.source(), outcomeCount, -1),
                r -> r.chunks().isEmpty() ? CurriculumMetrics.Outcome.REJECTED : CurriculumMetrics.Outcome.SUCCESS);
        requirePackagedCandidates(dataset, candidates.chunks());
        if (candidates.chunks().isEmpty())
            throw new CurriculumEvidenceNotFoundException(suggestionGuidance(candidates.suggestions()));
        var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                () -> semanticVerifier.verify(topic, subject, grade, null, candidates.chunks()),
                d -> d.status() == SemanticCurriculumEvidenceVerifier.Status.SUPPORTED
                        ? CurriculumMetrics.Outcome.SUCCESS : CurriculumMetrics.Outcome.REJECTED);
        var selected = selectSemanticEvidence(decision, candidates.chunks(), candidates.chunks());
        return Evidence.found(provenanceContext(new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND, selected)
                .curriculumContext(), dataset), com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(
                        dataset.source(), embeddingModel, selected));
    }

    /** Recheck the retrieved text against the versioned packaged corpus before trusting model citations. */
    static void requirePackagedCandidates(CurriculumDataset dataset,
            java.util.List<CurriculumRAGService.RetrievedChunk> candidates) {
        var primary = dataset.chunks().stream().filter(c -> !c.control()).collect(
                java.util.stream.Collectors.toMap(CurriculumChunk::chunkId, java.util.function.Function.identity()));
        var seen = new java.util.HashSet<String>();
        for (var candidate : candidates) {
            var original = primary.get(candidate.chunkId());
            if (original == null || !seen.add(candidate.chunkId()) || original.subject() != candidate.subject()
                    || original.gradeLevel() != candidate.gradeLevel() || !original.text().equals(candidate.text())
                    || !original.topic().equals(candidate.topic())
                    || !java.util.Objects.equals(original.ageBand(), candidate.ageBand())
                    || !java.util.Objects.equals(original.domain(), candidate.domain())
                    || !original.sourceFragments().stream().map(CurriculumChunk.SourceFragment::pdfPage).distinct().toList()
                            .equals(candidate.pdfPages())
                    || !original.sourceFragments().stream().map(CurriculumChunk.SourceFragment::printedPage).distinct().toList()
                            .equals(candidate.printedPages())
                    || !dataset.source().curriculumVersion().equals(candidate.curriculumVersion())
                    || !dataset.source().sourceDocument().equals(candidate.sourceDocument()))
                throw new IllegalStateException("Retrieved evidence differs from the selected packaged corpus");
        }
    }

    private static java.util.List<String> requireSemanticDecision(SemanticCurriculumEvidenceVerifier.Decision decision,
            java.util.List<CurriculumRAGService.RetrievedChunk> suggestions) {
        if (decision == null) throw new IllegalStateException("Semantic verifier returned no decision");
        return switch (decision.status()) {
            case SUPPORTED -> decision.supportedChunkIds();
            case NEEDS_CLARIFICATION -> throw new CurriculumClarificationRequiredException(
                    "Cần làm rõ yêu cầu trước khi đối chiếu chương trình (" + decision.reasonCode() + ").");
            case INSUFFICIENT_EVIDENCE -> throw new CurriculumEvidenceNotFoundException(
                    suggestionGuidance(suggestions));
        };
    }

    private static java.util.List<CurriculumRAGService.RetrievedChunk> selectSemanticEvidence(
            SemanticCurriculumEvidenceVerifier.Decision decision,
            java.util.List<CurriculumRAGService.RetrievedChunk> candidates,
            java.util.List<CurriculumRAGService.RetrievedChunk> suggestions) {
        var ids = requireSemanticDecision(decision, suggestions);
        if (ids.isEmpty()) throw new IllegalStateException("Supported semantic decision contains no chunk IDs");
        var candidateIds = candidates.stream().map(CurriculumRAGService.RetrievedChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        if (!candidateIds.containsAll(ids)) throw new IllegalStateException("Verifier selected a chunk outside the selected dataset");
        return candidates.stream().filter(c -> ids.contains(c.chunkId())).toList();
    }

    private static String suggestionGuidance(java.util.List<CurriculumRAGService.RetrievedChunk> suggestions) {
        if (suggestions == null || suggestions.isEmpty()) return "Chưa tìm thấy YCCĐ phù hợp; hãy mô tả mục tiêu bài học cụ thể hơn.";
        String closest = suggestions.stream().limit(3).map(c -> c.topic() + " — " + c.text()
                + " (PDF " + c.pdfPages().stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(",")) + ")")
                .collect(java.util.stream.Collectors.joining("; "));
        return "Chưa tìm thấy căn cứ đủ phù hợp. Gợi ý gần nhất: " + closest + ".";
    }

    private static String kindergartenGuidance(java.util.List<CurriculumRAGService.RetrievedChunk> suggestions) {
        if (suggestions == null || suggestions.isEmpty())
            return "Chưa tìm thấy kết quả mong đợi phù hợp trong chương trình mẫu giáo; thử mô tả hoạt động cụ thể hơn.";
        String nearest = suggestions.stream().limit(3).map(c -> c.topic() + " — " + c.text()
                        + " (" + switch (c.ageBand()) {
                            case "AGE_3_4" -> "3–4 tuổi";
                            case "AGE_4_5" -> "4–5 tuổi";
                            case "AGE_5_6" -> "5–6 tuổi";
                            default -> "độ tuổi mẫu giáo";
                        } + "; PDF " + c.pdfPages().stream().map(String::valueOf)
                                .collect(java.util.stream.Collectors.joining(",")) + ")")
                .collect(java.util.stream.Collectors.joining("; "));
        return "Chưa tìm thấy căn cứ đủ phù hợp trong chương trình mẫu giáo. Gợi ý gần nhất để cô chọn: "
                + nearest + ".";
    }

    private static String ageLabel(String ageBand) {
        return switch (ageBand) {
            case "AGE_3_4" -> "3–4 tuổi";
            case "AGE_4_5" -> "4–5 tuổi";
            case "AGE_5_6" -> "5–6 tuổi";
            default -> throw new IllegalArgumentException("Unknown kindergarten age band");
        };
    }
}
