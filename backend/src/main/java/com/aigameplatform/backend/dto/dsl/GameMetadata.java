package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GameMetadata(
        String title,
        Subject subject,
        GradeLevel gradeLevel,
        String topic) {
}
