package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.enums.GameType;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;

/** Game JSON DSL v1.0.0. Loại game được xác định bởi thuộc tính gameType. */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY, property = "gameType", visible = true)
@JsonSubTypes({
    @JsonSubTypes.Type(value = QuizGameDsl.class, name = "QUIZ"),
    @JsonSubTypes.Type(value = AudioVisualMatchGameDsl.class, name = "AUDIO_VISUAL_MATCH"),
    @JsonSubTypes.Type(value = OddOneOutGameDsl.class, name = "ODD_ONE_OUT"),
    @JsonSubTypes.Type(value = SpotTheTargetGameDsl.class, name = "SPOT_THE_TARGET"),
    @JsonSubTypes.Type(value = WordScrambleGameDsl.class, name = "WORD_SCRAMBLE"),
    @JsonSubTypes.Type(value = MatchingGameDsl.class, name = "MATCHING"),
    @JsonSubTypes.Type(value = MemoryCardGameDsl.class, name = "MEMORY_CARD"),
    @JsonSubTypes.Type(value = DragDropGameDsl.class, name = "DRAG_DROP"),
    @JsonSubTypes.Type(value = OrderingGameDsl.class, name = "ORDERING"),
    @JsonSubTypes.Type(value = VisualClozeGameDsl.class, name = "VISUAL_CLOZE")
})
public sealed interface GameDsl permits QuizGameDsl, AudioVisualMatchGameDsl, OddOneOutGameDsl, SpotTheTargetGameDsl, WordScrambleGameDsl, MatchingGameDsl, MemoryCardGameDsl, DragDropGameDsl, OrderingGameDsl, VisualClozeGameDsl {

    String schemaVersion();

    GameType gameType();

    GameMetadata metadata();

    GameplaySettings gameplaySettings();

    List<? extends QuestionDsl> questions();
}
