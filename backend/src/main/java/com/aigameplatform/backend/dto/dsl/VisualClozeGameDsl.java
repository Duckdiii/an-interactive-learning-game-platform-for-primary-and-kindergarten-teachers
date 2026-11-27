package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VisualClozeGameDsl(
        String schemaVersion,
        GameType gameType,
        VisualClozeMode mode,
        GameMetadata metadata,
        GameplaySettings gameplaySettings,
        List<VisualClozeQuestionDsl> questions) implements GameDsl {

    public VisualClozeGameDsl(String schemaVersion, GameType gameType, GameMetadata metadata,
            GameplaySettings gameplaySettings, List<VisualClozeQuestionDsl> questions) {
        this(schemaVersion, gameType, null, metadata, gameplaySettings, questions);
    }

    public VisualClozeMode effectiveMode() {
        return mode == null ? VisualClozeMode.TEXT : mode;
    }
}
