package com.aigameplatform.backend.entity.enums;

public enum GameType {
    MATCHING, QUIZ, MEMORY_CARD, DRAG_DROP, ORDERING, WORD_SCRAMBLE, ODD_ONE_OUT, VISUAL_CLOZE, AUDIO_VISUAL_MATCH, SPOT_THE_TARGET,
    /** Game ngoài danh mục theo CPF Game v2.0.0, không thuộc Game JSON DSL v1.0.0. Giữ ở cuối để thứ tự 10 loại DSL không đổi. */
    CUSTOM;

    private static final GameType[] DSL_TYPES = java.util.Arrays.stream(values())
            .filter(type -> type != CUSTOM).toArray(GameType[]::new);

    /** 10 loại theo Game JSON DSL v1.0.0 (mỗi loại có schema, strategy, factory riêng). */
    public static GameType[] dslTypes() {
        return DSL_TYPES.clone();
    }
}
