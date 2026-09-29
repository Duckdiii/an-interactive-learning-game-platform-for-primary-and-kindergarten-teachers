package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GameContentStrategyTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static final List<GameContentStrategy> STRATEGIES = List.of(
            new QuizGameStrategy(), new AudioVisualMatchGameStrategy(), new OddOneOutGameStrategy(),
            new SpotTheTargetGameStrategy(), new WordScrambleGameStrategy(), new MatchingGameStrategy(),
            new MemoryCardGameStrategy(), new DragDropGameStrategy(), new OrderingGameStrategy(),
            new VisualClozeGameStrategy());

    @Test
    void thereIsExactlyOneStrategyPerGameType() {
        assertThat(STRATEGIES).extracting(GameContentStrategy::getSupportedType)
                .containsExactlyInAnyOrder(GameType.values());
    }

    @Test
    void everyStrategyProvidesTheStructuredSchemaOfItsOwnGameType() {
        for (GameContentStrategy strategy : STRATEGIES) {
            JsonNode schema = MAPPER.readTree(strategy.getStructuredSchema());

            assertThat(schema.get("properties").has("questions")).as(strategy.getSupportedType().name()).isTrue();
            assertThat(strategy.getStructuredSchema())
                    .as(strategy.getSupportedType().name())
                    .isSameAs(strategy.getStructuredSchema());
        }
    }

    @Test
    void theQuizSchemaAsksForTheGeminiSpikeShape() {
        JsonNode question = MAPPER.readTree(new QuizGameStrategy().getStructuredSchema())
                .get("properties").get("questions").get("items");

        assertThat(question.get("required")).extracting(JsonNode::asString).containsExactly("text", "options", "correctIndex");
        assertThat(question.get("properties").has("id")).isFalse();
        assertThat(question.get("additionalProperties").asBoolean()).isFalse();
    }

    @Test
    void anExplicitlyAssignedSchemaStillWins() {
        GameContentStrategy strategy = new QuizGameStrategy();
        strategy.setJsonSchemaDefinition("{\"custom\":true}");

        assertThat(strategy.getStructuredSchema()).isEqualTo("{\"custom\":true}");
    }
}
