package com.aigameplatform.backend.dto.dsl;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GameType;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class GameDslSchemaTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final SchemaRegistry REGISTRY = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12);

    private static final Map<GameType, Class<? extends GameDsl>> GAME_CLASSES = Map.of(
            GameType.QUIZ, QuizGameDsl.class,
            GameType.AUDIO_VISUAL_MATCH, AudioVisualMatchGameDsl.class,
            GameType.ODD_ONE_OUT, OddOneOutGameDsl.class,
            GameType.SPOT_THE_TARGET, SpotTheTargetGameDsl.class,
            GameType.WORD_SCRAMBLE, WordScrambleGameDsl.class,
            GameType.MATCHING, MatchingGameDsl.class,
            GameType.MEMORY_CARD, MemoryCardGameDsl.class,
            GameType.DRAG_DROP, DragDropGameDsl.class,
            GameType.ORDERING, OrderingGameDsl.class,
            GameType.VISUAL_CLOZE, VisualClozeGameDsl.class);

    private static String fileName(GameType type) {
        return type.name().toLowerCase().replace('_', '-');
    }

    private static Schema schemaOf(GameType type) throws IOException {
        try (InputStream in = GameDslSchemaTest.class.getResourceAsStream(
                "/schema/game-dsl/1.0.0/" + fileName(type) + ".schema.json")) {
            return REGISTRY.getSchema(in);
        }
    }

    private static JsonNode exampleOf(GameType type) throws IOException {
        try (InputStream in = GameDslSchemaTest.class.getResourceAsStream(
                "/dsl-examples/" + fileName(type) + ".json")) {
            return MAPPER.readTree(in);
        }
    }

    private static JsonNode mutated(GameType type, Consumer<ObjectNode> mutation) throws IOException {
        ObjectNode copy = (ObjectNode) exampleOf(type).deepCopy();
        mutation.accept(copy);
        return copy;
    }

    private static ObjectNode question(ObjectNode game, int index) {
        return (ObjectNode) ((ArrayNode) game.get("questions")).get(index);
    }

    private static List<Error> errorsOf(GameType type, JsonNode json) throws IOException {
        return schemaOf(type).validate(json);
    }

    // ---- ví dụ hợp lệ ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyExampleIsValidAgainstItsSchema(GameType type) throws IOException {
        assertThat(errorsOf(type, exampleOf(type))).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyExampleRoundTripsThroughTheJavaRecords(GameType type) throws IOException {
        JsonNode example = exampleOf(type);

        GameDsl game = MAPPER.readValue(MAPPER.writeValueAsString(example), GameDsl.class);

        assertThat(game).isInstanceOf(GAME_CLASSES.get(type));
        assertThat(game.gameType()).isEqualTo(type);
        assertThat(MAPPER.readTree(MAPPER.writeValueAsString(game))).isEqualTo(example);
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void anExampleIsRejectedByTheSchemaOfAnotherGameType(GameType type) throws IOException {
        GameType other = GameType.values()[(type.ordinal() + 1) % GameType.values().length];

        assertThat(errorsOf(other, exampleOf(type))).isNotEmpty();
    }

    // ---- ví dụ không hợp lệ: Layer 1 phải chặn ----

    @Test
    void rejectsWrongSchemaVersion() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> g.put("schemaVersion", "2.0.0"));

        assertThat(errorsOf(GameType.QUIZ, json)).isNotEmpty();
    }

    @Test
    void rejectsMissingSchemaVersion() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> g.remove("schemaVersion"));

        assertThat(errorsOf(GameType.QUIZ, json)).isNotEmpty();
    }

    @Test
    void rejectsUnknownProperties() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> question(g, 0).put("hackerField", "x"));

        assertThat(errorsOf(GameType.QUIZ, json)).isNotEmpty();
    }

    @Test
    void rejectsUnknownGradeLevel() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> ((ObjectNode) g.get("metadata")).put("gradeLevel", "ELEMENTARY"));

        assertThat(errorsOf(GameType.QUIZ, json)).isNotEmpty();
    }

    @Test
    void rejectsQuizWithFiveOptions() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> {
            ArrayNode options = (ArrayNode) question(g, 0).get("options");
            options.addObject().put("id", "d").put("text", "5");
            options.addObject().put("id", "e").put("text", "6");
        });

        assertThat(errorsOf(GameType.QUIZ, json)).isNotEmpty();
    }

    @Test
    void rejectsQuizWithoutCorrectOptionId() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> question(g, 0).remove("correctOptionId"));

        assertThat(errorsOf(GameType.QUIZ, json)).isNotEmpty();
    }

    @Test
    void rejectsSpotTheTargetRegionOutsideTheImage() throws IOException {
        JsonNode json = mutated(GameType.SPOT_THE_TARGET,
                g -> ((ObjectNode) question(g, 0).get("hitRegion")).put("x", 1.5));

        assertThat(errorsOf(GameType.SPOT_THE_TARGET, json)).isNotEmpty();
    }

    @Test
    void acceptsSpotTheTargetDraftWithoutRegion() throws IOException {
        // q2 của ví dụ không có hitRegion; thêm hitRegion null tường minh cũng hợp lệ.
        JsonNode json = mutated(GameType.SPOT_THE_TARGET, g -> question(g, 1).putNull("hitRegion"));

        assertThat(errorsOf(GameType.SPOT_THE_TARGET, json)).isEmpty();
    }

    @Test
    void rejectsMemoryCardWithASinglePair() throws IOException {
        JsonNode json = mutated(GameType.MEMORY_CARD, g -> ((ArrayNode) question(g, 0).get("pairs")).remove(1));

        assertThat(errorsOf(GameType.MEMORY_CARD, json)).isNotEmpty();
    }

    @Test
    void rejectsMatchingSideWithoutTextOrVisualPrompt() throws IOException {
        JsonNode json = mutated(GameType.MATCHING, g -> {
            ObjectNode pair = (ObjectNode) ((ArrayNode) question(g, 0).get("pairs")).get(0);
            pair.putObject("right");
        });

        assertThat(errorsOf(GameType.MATCHING, json)).isNotEmpty();
    }

    @Test
    void rejectsClozeWithoutABlank() throws IOException {
        JsonNode json = mutated(GameType.VISUAL_CLOZE, g -> question(g, 0).put("sentenceTemplate", "Con mèo kêu meo meo."));

        assertThat(errorsOf(GameType.VISUAL_CLOZE, json)).isNotEmpty();
    }

    @Test
    void rejectsWordWithSpaces() throws IOException {
        JsonNode json = mutated(GameType.WORD_SCRAMBLE, g -> question(g, 0).put("correctWord", "CON BÒ"));

        assertThat(errorsOf(GameType.WORD_SCRAMBLE, json)).isNotEmpty();
    }

    @Test
    void rejectsDragDropItemWithoutTargetZone() throws IOException {
        JsonNode json = mutated(GameType.DRAG_DROP, g -> {
            ObjectNode item = (ObjectNode) ((ArrayNode) question(g, 0).get("items")).get(0);
            item.remove("targetZoneId");
        });

        assertThat(errorsOf(GameType.DRAG_DROP, json)).isNotEmpty();
    }

    @Test
    void reportsWhereTheProblemIs() throws IOException {
        JsonNode json = mutated(GameType.QUIZ, g -> question(g, 1).remove("questionText"));

        List<Error> errors = errorsOf(GameType.QUIZ, json);

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).getMessage()).contains("questionText");
    }
}
