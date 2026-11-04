package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

public record GameGenerationRequest(
    String prompt,
    GradeLevel gradeLevel,
    Subject subject,
    String topic,
    String theme,
    GameType gameType
) {}
