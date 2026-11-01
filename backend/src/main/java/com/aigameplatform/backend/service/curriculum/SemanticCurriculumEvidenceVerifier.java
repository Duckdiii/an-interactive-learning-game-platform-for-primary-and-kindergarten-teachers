package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.entity.enums.Subject;
import java.util.List;

/** Semantic gate for scopes that do not have a reviewed deterministic capability sidecar. */
@FunctionalInterface
public interface SemanticCurriculumEvidenceVerifier {
    enum Status { SUPPORTED, INSUFFICIENT_EVIDENCE, NEEDS_CLARIFICATION }
    record Decision(Status status, String reasonCode, List<String> supportedChunkIds) {
        public Decision {
            if (status == null || reasonCode == null || !reasonCode.matches("[A-Z0-9_]{1,64}") || supportedChunkIds == null)
                throw new IllegalArgumentException("A complete semantic verification decision is required");
            supportedChunkIds = List.copyOf(supportedChunkIds);
        }
    }

    Decision verify(String teacherTopic, Subject subject, GradeLevel grade, KindergartenAgeBand ageBand,
                    List<CurriculumRAGService.RetrievedChunk> candidates);
}
