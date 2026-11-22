package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;

public record RegeneratedQuestionDto(
        QuestionDsl question,
        GameType gameType
) {}
