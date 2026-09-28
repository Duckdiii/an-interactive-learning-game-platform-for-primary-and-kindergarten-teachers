package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GameType;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MemoryCardGameDsl(
        String schemaVersion,
        GameType gameType,
        GameMetadata metadata,
        GameplaySettings gameplaySettings,
        List<MemoryCardQuestionDsl> questions) implements GameDsl {
}
