package com.aigameplatform.backend.entity.enums;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GameTypeTest {

    @Test
    void dslTypesAreTheTenPresetTypesWithoutCustom() {
        assertThat(GameType.dslTypes()).hasSize(10).doesNotContain(GameType.CUSTOM);
        assertThat(GameType.values()).hasSize(11).endsWith(GameType.CUSTOM);
    }

    @Test
    void dslTypesReturnsACopy() {
        GameType[] first = GameType.dslTypes();
        first[0] = GameType.CUSTOM;
        assertThat(GameType.dslTypes()).doesNotContain(GameType.CUSTOM);
    }
}
