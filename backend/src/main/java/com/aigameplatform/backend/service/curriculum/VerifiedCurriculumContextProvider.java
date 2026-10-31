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
    }

    @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade) {
        return retrieve(topic, subject, grade, null);
    }

    @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade,
                                      KindergartenAgeBand kindergartenAgeBand) {
        if (grade == GradeLevel.KINDERGARTEN && kindergartenAgeBand == null)
            throw new KindergartenAgeBandRequiredException();
        if (grade != GradeLevel.KINDERGARTEN && kindergartenAgeBand != null)
            throw new IllegalArgumentException("Age band may only be supplied for kindergarten");
        var dataset = catalog.requireSupported(GameType.QUIZ, subject, grade);
        try {
            if (grade == GradeLevel.KINDERGARTEN) {
                availability.requireReady(dataset);
                var candidates = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, subject, grade,
                        () -> retrieval.get().retrieveKindergarten(topic, subject, dataset.source(), kindergartenAgeBand,
                                kindergartenTopK, kindergartenMinScore), r -> r.chunks().isEmpty()
                                ? CurriculumMetrics.Outcome.REJECTED : CurriculumMetrics.Outcome.SUCCESS);
                if (candidates.chunks().isEmpty())
                    throw new CurriculumEvidenceNotFoundException(kindergartenGuidance(candidates.suggestions()));
                return Evidence.found(candidates.curriculumContext(),
                        com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(
                                dataset.source(), embeddingModel, candidates.chunks()));
            }
            var capabilities = loaded;
            if (capabilities == null) { capabilities = constraints.get(); loaded = capabilities; }
            capabilities.requireApproved(approvedSha);
            availability.requireReady(dataset);
            var parsed = parser.parse(topic);
            if (parsed.needsClarification()) {
                var checked = capabilities;
                var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                        () -> verifier.verify(parsed, java.util.List.of(), checked), d -> CurriculumMetrics.Outcome.REJECTED);
                throw new CurriculumEvidenceNotFoundException(guidance.message(decision, dataset, java.util.List.of()));
            }
            var candidates = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, subject, grade,
                    () -> retrieval.get().retrieve(topic, subject, grade), r -> r.chunks().isEmpty()
                            ? CurriculumMetrics.Outcome.REJECTED : CurriculumMetrics.Outcome.SUCCESS);
            var checked = capabilities;
            var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                    () -> verifier.verify(parsed, candidates.chunks(), checked), d -> d.status() == CurriculumEvidenceVerifier.Status.SUPPORTED
                            ? CurriculumMetrics.Outcome.SUCCESS : CurriculumMetrics.Outcome.REJECTED);
            if (decision.status() != CurriculumEvidenceVerifier.Status.SUPPORTED)
                throw new CurriculumEvidenceNotFoundException(guidance.message(decision, dataset,
                        candidates.chunks().isEmpty() ? candidates.suggestions() : candidates.chunks()));
            var selected = candidates.chunks().stream().filter(c -> decision.supportedChunkIds().contains(c.chunkId())).toList();
            return Evidence.found(new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND, selected).curriculumContext(),
                    com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence.from(dataset.source(), embeddingModel, selected));
        } catch (CurriculumEvidenceNotFoundException | CurriculumServiceUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new CurriculumServiceUnavailableException(
                    "Không truy xuất được căn cứ chương trình; vui lòng thử lại sau.", null);
        }
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
}
