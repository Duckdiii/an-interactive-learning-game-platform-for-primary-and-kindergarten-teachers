package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GameType;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VisualClozeGameDsl(
        String schemaVersion,
        GameType gameType,
        GameMetadata metadata,
        GameplaySettings gameplaySettings,
        List<VisualClozeQuestionDsl> questions) implements GameDsl {
}
