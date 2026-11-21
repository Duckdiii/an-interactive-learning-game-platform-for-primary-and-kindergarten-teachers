package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GameMetadata(
        String title,
        Subject subject,
        GradeLevel gradeLevel,
        String topic,
        PresentationDsl presentation) {

    /** Game chưa có cách trình bày riêng: frontend tự chọn. */
    public GameMetadata(String title, Subject subject, GradeLevel gradeLevel, String topic) {
        this(title, subject, gradeLevel, topic, null);
    }
}
