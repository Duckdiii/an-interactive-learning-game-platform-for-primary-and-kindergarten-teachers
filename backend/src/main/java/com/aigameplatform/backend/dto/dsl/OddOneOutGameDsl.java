package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OddOneOutGameDsl(
        String schemaVersion,
        GameType gameType,
        OddOneOutMode mode,
        GameMetadata metadata,
        GameplaySettings gameplaySettings,
        List<OddOneOutQuestionDsl> questions) implements GameDsl {
    public OddOneOutGameDsl(String schemaVersion, GameType gameType, GameMetadata metadata,
            GameplaySettings gameplaySettings, List<OddOneOutQuestionDsl> questions) {
        this(schemaVersion, gameType, null, metadata, gameplaySettings, questions);
    }

    public OddOneOutMode effectiveMode() { return mode == null ? OddOneOutMode.TEXT : mode; }
}
