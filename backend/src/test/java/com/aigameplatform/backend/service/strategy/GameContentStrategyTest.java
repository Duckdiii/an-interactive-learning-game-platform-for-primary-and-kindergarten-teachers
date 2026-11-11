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
            new QuizGameStrategy(MAPPER), new AudioVisualMatchGameStrategy(MAPPER), new OddOneOutGameStrategy(MAPPER),
            new SpotTheTargetGameStrategy(MAPPER), new WordScrambleGameStrategy(MAPPER), new MatchingGameStrategy(MAPPER),
            new MemoryCardGameStrategy(MAPPER), new DragDropGameStrategy(MAPPER), new OrderingGameStrategy(MAPPER),
            new VisualClozeGameStrategy(MAPPER));

    @Test
    void thereIsExactlyOneStrategyPerGameType() {
        assertThat(STRATEGIES).extracting(GameContentStrategy::getSupportedType)
                .containsExactlyInAnyOrder(GameType.dslTypes());
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
        JsonNode question = MAPPER.readTree(new QuizGameStrategy(MAPPER).getStructuredSchema())
                .get("properties").get("questions").get("items");

        assertThat(question.get("required")).extracting(JsonNode::asString).containsExactly("text", "options", "correctIndex");
        assertThat(question.get("properties").has("id")).isFalse();
        assertThat(question.get("additionalProperties").asBoolean()).isFalse();
    }

    @Test
    void everyTypeWithAVisualPromptAlsoOffersAnAssetFromTheCatalogExceptOddOneOut() {
        for (GameContentStrategy strategy : STRATEGIES) {
            assertThat(strategy.hasAssetField()).as(strategy.getSupportedType().name())
                    .isEqualTo(strategy.getSupportedType() != GameType.ODD_ONE_OUT);
        }
    }

    @Test
    void thePromptOffersEveryAllowedPresentationValue() {
        String prompt = new QuizGameStrategy(MAPPER).buildPrompt("biển", com.aigameplatform.backend.entity.enums.Subject.MATH,
                com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, null);

        java.util.stream.Stream.of(com.aigameplatform.backend.dto.dsl.PresentationDsl.WORLDS,
                        com.aigameplatform.backend.dto.dsl.PresentationDsl.CARRIERS, com.aigameplatform.backend.dto.dsl.PresentationDsl.LAYOUTS)
                .flatMap(java.util.List::stream).forEach(value -> assertThat(prompt).as(value).contains(value));
    }

    @Test
    void everyPromptAsksForVietnameseTitleAndInstructionsEvenForEnglish() {
        for (GameContentStrategy strategy : STRATEGIES) {
            String prompt = strategy.buildPrompt("colors song: red, blue",
                    com.aigameplatform.backend.entity.enums.Subject.ENGLISH,
                    com.aigameplatform.backend.entity.enums.GradeLevel.KINDERGARTEN, null);

            assertThat(prompt).as(strategy.getSupportedType().name())
                    .contains("title, câu hỏi, lời dẫn", "luôn viết bằng tiếng Việt", "Riêng môn Tiếng Anh")
                    .doesNotContain("Chỉ dùng từ tiếng Việt có thật");
        }
    }

    @Test
    void visualClozePromptUsesTheSupportedGradeAndQuestionShape() {
        var strategy = new VisualClozeGameStrategy(MAPPER);

        String prompt = strategy.buildPrompt("plant parts",
                com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_2);

        assertThat(prompt).contains("GRADE_2", "plant parts", "sentenceTemplate", "visualPrompt",
                "correctAnswer", "distractors");
    }

    @Test
    void anExplicitlyAssignedSchemaStillWins() {
        GameContentStrategy strategy = new QuizGameStrategy(MAPPER);
        strategy.setJsonSchemaDefinition("{\"custom\":true}");

        assertThat(strategy.getStructuredSchema()).isEqualTo("{\"custom\":true}");
    }
}
