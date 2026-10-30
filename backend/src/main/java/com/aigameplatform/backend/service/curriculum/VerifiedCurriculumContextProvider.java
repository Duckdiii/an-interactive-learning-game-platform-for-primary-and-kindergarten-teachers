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
        this.catalog = Objects.requireNonNull(catalog);
        this.availability = Objects.requireNonNull(availability);
        this.retrieval = Objects.requireNonNull(retrieval);
        this.constraints = Objects.requireNonNull(constraints);
        this.approvedSha = approvedSha;
        this.metrics = Objects.requireNonNull(metrics);
    }

    @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade) {
        var dataset = catalog.requireSupported(GameType.QUIZ, subject, grade);
        try {
            var capabilities = loaded;
            if (capabilities == null) { capabilities = constraints.get(); loaded = capabilities; }
            capabilities.requireApproved(approvedSha);
            availability.requireReady(dataset);
            var parsed = parser.parse(topic);
            if (parsed.needsClarification()) {
                var checked = capabilities;
                var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                        () -> verifier.verify(parsed, java.util.List.of(), checked), d -> CurriculumMetrics.Outcome.REJECTED);
                throw new CurriculumEvidenceNotFoundException(guidance.message(decision, dataset));
            }
            var candidates = metrics.measure(CurriculumMetrics.Stage.RETRIEVAL, subject, grade,
                    () -> retrieval.get().retrieve(topic, subject, grade), r -> r.chunks().isEmpty()
                            ? CurriculumMetrics.Outcome.REJECTED : CurriculumMetrics.Outcome.SUCCESS);
            var checked = capabilities;
            var decision = metrics.measure(CurriculumMetrics.Stage.VERIFICATION, subject, grade,
                    () -> verifier.verify(parsed, candidates.chunks(), checked), d -> d.status() == CurriculumEvidenceVerifier.Status.SUPPORTED
                            ? CurriculumMetrics.Outcome.SUCCESS : CurriculumMetrics.Outcome.REJECTED);
            if (decision.status() != CurriculumEvidenceVerifier.Status.SUPPORTED)
                throw new CurriculumEvidenceNotFoundException(guidance.message(decision, dataset));
            var selected = candidates.chunks().stream().filter(c -> decision.supportedChunkIds().contains(c.chunkId())).toList();
            return Evidence.found(new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND, selected).curriculumContext());
        } catch (CurriculumEvidenceNotFoundException | CurriculumServiceUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new CurriculumServiceUnavailableException(
                    "Không truy xuất được căn cứ chương trình; vui lòng thử lại sau.", null);
        }
    }
}
