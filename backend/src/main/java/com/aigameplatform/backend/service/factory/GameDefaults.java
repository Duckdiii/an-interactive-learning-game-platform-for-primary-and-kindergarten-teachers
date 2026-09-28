package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import java.util.EnumMap;
import java.util.Map;

/** Giá trị mặc định Backend gán khi dựng game; giáo viên vẫn sửa được từng màn trong Workspace. */
public final class GameDefaults {

    private static final int SINGLE_ANSWER_POINTS = 10;
    private static final int MULTI_ELEMENT_POINTS = 20;

    /** Thời gian mỗi màn (giây) trước khi nhân theo khối lớp. */
    private static final Map<GameType, Integer> BASE_TIME_SECONDS = new EnumMap<>(GameType.class);
    private static final Map<GameType, Integer> POINTS = new EnumMap<>(GameType.class);
    /** Trẻ nhỏ cần nhiều thời gian hơn. */
    private static final Map<GradeLevel, Double> TIME_MULTIPLIER = new EnumMap<>(GradeLevel.class);
    /** Trẻ nhỏ chạm kém chính xác nên vùng chạm được nới rộng. */
    private static final Map<GradeLevel, Double> HITBOX_SCALE = new EnumMap<>(GradeLevel.class);

    static {
        BASE_TIME_SECONDS.put(GameType.QUIZ, 30);
        BASE_TIME_SECONDS.put(GameType.AUDIO_VISUAL_MATCH, 20);
        BASE_TIME_SECONDS.put(GameType.ODD_ONE_OUT, 30);
        BASE_TIME_SECONDS.put(GameType.SPOT_THE_TARGET, 45);
        BASE_TIME_SECONDS.put(GameType.WORD_SCRAMBLE, 40);
        BASE_TIME_SECONDS.put(GameType.MATCHING, 60);
        BASE_TIME_SECONDS.put(GameType.MEMORY_CARD, 90);
        BASE_TIME_SECONDS.put(GameType.DRAG_DROP, 60);
        BASE_TIME_SECONDS.put(GameType.ORDERING, 60);
        BASE_TIME_SECONDS.put(GameType.VISUAL_CLOZE, 30);

        POINTS.put(GameType.QUIZ, SINGLE_ANSWER_POINTS);
        POINTS.put(GameType.AUDIO_VISUAL_MATCH, SINGLE_ANSWER_POINTS);
        POINTS.put(GameType.ODD_ONE_OUT, SINGLE_ANSWER_POINTS);
        POINTS.put(GameType.SPOT_THE_TARGET, SINGLE_ANSWER_POINTS);
        POINTS.put(GameType.WORD_SCRAMBLE, SINGLE_ANSWER_POINTS);
        POINTS.put(GameType.VISUAL_CLOZE, SINGLE_ANSWER_POINTS);
        POINTS.put(GameType.MATCHING, MULTI_ELEMENT_POINTS);
        POINTS.put(GameType.MEMORY_CARD, MULTI_ELEMENT_POINTS);
        POINTS.put(GameType.DRAG_DROP, MULTI_ELEMENT_POINTS);
        POINTS.put(GameType.ORDERING, MULTI_ELEMENT_POINTS);

        for (GradeLevel grade : GradeLevel.values()) {
            TIME_MULTIPLIER.put(grade, 1.0);
            HITBOX_SCALE.put(grade, 1.0);
        }
        TIME_MULTIPLIER.put(GradeLevel.KINDERGARTEN, 1.5);
        TIME_MULTIPLIER.put(GradeLevel.GRADE_1, 1.25);
        HITBOX_SCALE.put(GradeLevel.KINDERGARTEN, 1.5);
        HITBOX_SCALE.put(GradeLevel.GRADE_1, 1.5);
    }

    private GameDefaults() {
    }

    public static int timeLimitSeconds(GameType type, GradeLevel grade) {
        return (int) Math.ceil(BASE_TIME_SECONDS.get(type) * TIME_MULTIPLIER.get(grade));
    }

    public static int points(GameType type) {
        return POINTS.get(type);
    }

    public static double hitboxScale(GradeLevel grade) {
        return HITBOX_SCALE.get(grade);
    }
}
