package com.aigameplatform.backend.service.curriculum;

public record CurriculumSource(String sourceDocument, String sourceSha256, String curriculumVersion,
                               String datasetVersion, int pdfPageCount) {
    public CurriculumSource {
        if (sourceDocument == null || sourceDocument.isBlank() || sourceSha256 == null
                || !sourceSha256.matches("[a-f0-9]{64}") || curriculumVersion == null || curriculumVersion.isBlank()
                || datasetVersion == null || datasetVersion.isBlank() || pdfPageCount < 1) {
            throw new IllegalArgumentException("Complete curriculum source provenance is required");
        }
    }
}
