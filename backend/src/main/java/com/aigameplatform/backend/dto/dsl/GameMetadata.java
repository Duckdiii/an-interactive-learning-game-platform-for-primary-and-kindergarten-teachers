package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.curriculum.CurriculumEvidenceReview;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GameMetadata(
        String title,
        Subject subject,
        GradeLevel gradeLevel,
        String topic,
        CurriculumEvidenceReview curriculumReview) {

    /** Backward-compatible constructor for games that have not received a curriculum review. */
    public GameMetadata(String title, Subject subject, GradeLevel gradeLevel, String topic) {
        this(title, subject, gradeLevel, topic, null);
    }
}