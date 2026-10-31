package com.aigameplatform.backend.service.curriculum.review;

import com.aigameplatform.backend.service.curriculum.CurriculumRAGService.RetrievedChunk;
import com.aigameplatform.backend.service.curriculum.CurriculumSource;
import java.util.List;

/** Teacher-side provenance, independent of the frozen game DSL. */
public record CurriculumEvidence(String sourceDocument, String sourceSha256, String datasetVersion,
                                 String curriculumVersion, String embeddingModel, List<RetrievedChunk> chunks) {
    public CurriculumEvidence { chunks = List.copyOf(chunks); }
    public static CurriculumEvidence from(CurriculumSource source, String model, List<RetrievedChunk> chunks) {
        return new CurriculumEvidence(source.sourceDocument(), source.sourceSha256(), source.datasetVersion(),
                source.curriculumVersion(), model, chunks);
    }
    public static CurriculumEvidence empty() { return new CurriculumEvidence("", "", "", "", "", List.of()); }
}
