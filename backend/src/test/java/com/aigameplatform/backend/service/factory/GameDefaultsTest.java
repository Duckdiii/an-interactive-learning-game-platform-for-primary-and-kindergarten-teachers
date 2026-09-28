package com.aigameplatform.backend.service.factory;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class GameDefaultsTest {

    @Test
    void youngChildrenGetABiggerHitbox() {
        assertThat(GameDefaults.hitboxScale(GradeLevel.KINDERGARTEN)).isEqualTo(1.5);
        assertThat(GameDefaults.hitboxScale(GradeLevel.GRADE_1)).isEqualTo(1.5);
        assertThat(GameDefaults.hitboxScale(GradeLevel.GRADE_2)).isEqualTo(1.0);
        assertThat(GameDefaults.hitboxScale(GradeLevel.GRADE_5)).isEqualTo(1.0);
    }

    @Test
    void timeIsScaledByGradeAndRoundedUp() {
        assertThat(GameDefaults.timeLimitSeconds(GameType.QUIZ, GradeLevel.KINDERGARTEN)).isEqualTo(45);
        assertThat(GameDefaults.timeLimitSeconds(GameType.QUIZ, GradeLevel.GRADE_1)).isEqualTo(38); // 37.5
        assertThat(GameDefaults.timeLimitSeconds(GameType.QUIZ, GradeLevel.GRADE_3)).isEqualTo(30);
        assertThat(GameDefaults.timeLimitSeconds(GameType.MEMORY_CARD, GradeLevel.KINDERGARTEN)).isEqualTo(135);
        assertThat(GameDefaults.timeLimitSeconds(GameType.AUDIO_VISUAL_MATCH, GradeLevel.GRADE_2)).isEqualTo(20);
    }

    @Test
    void multiElementGamesAreWorthMorePoints() {
        assertThat(GameDefaults.points(GameType.QUIZ)).isEqualTo(10);
        assertThat(GameDefaults.points(GameType.WORD_SCRAMBLE)).isEqualTo(10);
        assertThat(GameDefaults.points(GameType.MATCHING)).isEqualTo(20);
        assertThat(GameDefaults.points(GameType.ORDERING)).isEqualTo(20);
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyCombinationStaysWithinTheDslLimits(GameType type) {
        for (GradeLevel grade : GradeLevel.values()) {
            assertThat(GameDefaults.timeLimitSeconds(type, grade)).isBetween(5, 600);
            assertThat(GameDefaults.points(type)).isBetween(1, 100);
            assertThat(GameDefaults.hitboxScale(grade)).isGreaterThan(0).isLessThanOrEqualTo(3);
        }
    }
}
