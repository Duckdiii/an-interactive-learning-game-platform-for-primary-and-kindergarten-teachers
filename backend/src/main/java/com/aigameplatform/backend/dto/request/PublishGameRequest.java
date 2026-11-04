package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

public record PublishGameRequest(
    String title,
    GameType gameType,
    GradeLevel grade,
    Subject subject,
    Object dsl
) {}
