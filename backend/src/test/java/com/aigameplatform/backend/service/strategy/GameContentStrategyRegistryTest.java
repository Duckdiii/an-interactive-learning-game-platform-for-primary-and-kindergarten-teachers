package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig({GameContentStrategyRegistry.class, QuizGameStrategy.class, AudioVisualMatchGameStrategy.class,
        OddOneOutGameStrategy.class, SpotTheTargetGameStrategy.class, WordScrambleGameStrategy.class,
        MatchingGameStrategy.class, MemoryCardGameStrategy.class, DragDropGameStrategy.class,
        OrderingGameStrategy.class, VisualClozeGameStrategy.class})
class GameContentStrategyRegistryTest {

    @Autowired
    private GameContentStrategyRegistry registry;

    @Test
    void springWiresOneStrategyForEveryGameType() {
        for (GameType type : GameType.values()) {
            assertThat(registry.get(type).getSupportedType()).isEqualTo(type);
        }
    }

    @Test
    void aMissingStrategyFailsAtStartup() {
        assertThatThrownBy(() -> new GameContentStrategyRegistry(List.of(new QuizGameStrategy())))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Chưa có strategy");
    }

    @Test
    void aDuplicateStrategyFailsAtStartup() {
        assertThatThrownBy(() -> new GameContentStrategyRegistry(
                List.of(new QuizGameStrategy(), new QuizGameStrategy())))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("hơn một strategy");
    }
}
