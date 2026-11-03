package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import java.util.List;
import java.util.Set;

/** Domain-specific gate for preschool evidence; vector similarity alone must never produce accepted evidence. */
public interface KindergartenEvidenceVerifier {
    Set<String> supportedChunkIds(String teacherTopic, KindergartenAgeBand requestedAge,
                                  List<CurriculumRAGService.RetrievedChunk> candidates);
}
