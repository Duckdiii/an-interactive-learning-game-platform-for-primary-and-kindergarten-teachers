package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record RegeneratedQuestionDto(
        QuestionDsl question,
        GameType gameType,
        String schemaVersion
) {
    public RegeneratedQuestionDto(QuestionDsl question, GameType gameType) {
        this(question, gameType, null);
    }
}
