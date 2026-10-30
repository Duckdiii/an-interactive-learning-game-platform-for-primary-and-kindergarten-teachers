package com.aigameplatform.backend.service.curriculum;

public final class CurriculumRejectionGuidance {
    public String message(CurriculumEvidenceVerifier.VerificationDecision decision, CurriculumDataset dataset) {
        String instruction = decision.status() == CurriculumEvidenceVerifier.Status.NEEDS_CLARIFICATION
                ? "Vui lòng làm rõ kỹ năng, phạm vi số và điều kiện cần học bằng tiếng Việt có dấu."
                : "Chưa tìm được căn cứ cho mọi điều kiện. Vui lòng kiểm tra phạm vi số, phép tính và điều kiện có nhớ/không nhớ.";
        String topics = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::topic).distinct()
                .limit(3).collect(java.util.stream.Collectors.joining("; "));
        return instruction + " Chủ đề đã có căn cứ trong môn/lớp này: " + topics + ".";
    }
}
