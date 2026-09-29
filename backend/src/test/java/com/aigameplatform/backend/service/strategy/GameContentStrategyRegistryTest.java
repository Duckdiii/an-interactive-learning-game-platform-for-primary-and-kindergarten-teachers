package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import tools.jackson.databind.json.JsonMapper;

@SpringJUnitConfig({GameContentStrategyRegistry.class, QuizGameStrategy.class, AudioVisualMatchGameStrategy.class,
        OddOneOutGameStrategy.class, SpotTheTargetGameStrategy.class, WordScrambleGameStrategy.class,
        MatchingGameStrategy.class, MemoryCardGameStrategy.class, DragDropGameStrategy.class,
        OrderingGameStrategy.class, VisualClozeGameStrategy.class})
@ImportAutoConfiguration(JacksonAutoConfiguration.class)
class GameContentStrategyRegistryTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

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
        assertThatThrownBy(() -> new GameContentStrategyRegistry(List.of(new QuizGameStrategy(MAPPER))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Chưa có strategy");
    }

    @Test
    void aDuplicateStrategyFailsAtStartup() {
        assertThatThrownBy(() -> new GameContentStrategyRegistry(
                List.of(new QuizGameStrategy(MAPPER), new QuizGameStrategy(MAPPER))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("hơn một strategy");
    }
}
