package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GameType;
import org.junit.jupiter.api.Test;

class GameDslSchemaRegistryTest {

    @Test
    void loadsASchemaForEveryGameType() {
        GameDslSchemaRegistry registry = new GameDslSchemaRegistry();

        for (GameType type : GameType.values()) {
            assertThat(registry.schemaFor(type)).as("schema of %s", type).isNotNull();
        }
    }

    @Test
    void supportsOnlyVersion1_0_0() {
        assertThat(GameDslSchemaRegistry.SUPPORTED_VERSION).isEqualTo("1.0.0");
    }
}
