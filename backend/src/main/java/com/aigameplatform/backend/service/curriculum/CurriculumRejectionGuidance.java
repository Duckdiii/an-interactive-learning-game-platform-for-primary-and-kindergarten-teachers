package com.aigameplatform.backend.service.curriculum;

public final class CurriculumRejectionGuidance {
    public String message(CurriculumEvidenceVerifier.VerificationDecision decision, CurriculumDataset dataset) {
        return message(decision, dataset, java.util.List.of());
    }

    public String message(CurriculumEvidenceVerifier.VerificationDecision decision, CurriculumDataset dataset,
                          java.util.List<CurriculumRAGService.RetrievedChunk> nearest) {
        String instruction = decision.status() == CurriculumEvidenceVerifier.Status.NEEDS_CLARIFICATION
                ? "Vui lòng làm rõ kỹ năng, phạm vi số và điều kiện cần học bằng tiếng Việt có dấu."
                : "Chưa tìm được căn cứ cho mọi điều kiện. Vui lòng kiểm tra phạm vi số, phép tính và điều kiện có nhớ/không nhớ.";
        if (nearest == null || nearest.isEmpty()) {
            String publishedTopics = dataset.chunks().stream().filter(c -> !c.control()).limit(3)
                    .map(c -> c.topic() + " (" + c.text() + ")")
                    .collect(java.util.stream.Collectors.joining("; "));
            return instruction + " Thử mô tả kỹ năng cụ thể hơn trong cùng môn/lớp."
                    + (publishedTopics.isBlank() ? "" : " Một số nội dung đã công bố: " + publishedTopics + ".");
        }
        String topics = nearest.stream().limit(3).map(c -> c.topic() + " — " + c.text()
                        + " (" + c.sourceDocument() + ", PDF " + c.pdfPages().stream().map(String::valueOf)
                                .collect(java.util.stream.Collectors.joining(",")) + ")")
                .collect(java.util.stream.Collectors.joining("; "));
        return instruction + " Gợi ý kết quả mong đợi gần nhất trong cùng môn/lớp để cô chọn: " + topics + ".";
    }
}
