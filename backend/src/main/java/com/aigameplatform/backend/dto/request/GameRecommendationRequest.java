package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

public record GameRecommendationRequest(
    String prompt,
    GradeLevel gradeLevel,
    Subject subject
) {}
