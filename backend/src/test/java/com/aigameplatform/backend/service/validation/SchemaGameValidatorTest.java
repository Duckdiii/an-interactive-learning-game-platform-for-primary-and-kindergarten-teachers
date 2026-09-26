package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class SchemaGameValidatorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslSchemaRegistry REGISTRY = new GameDslSchemaRegistry();

    private final SchemaGameValidator validator = new SchemaGameValidator(REGISTRY, MAPPER);

    private static ObjectNode example(GameType type) throws IOException {
        String file = type.name().toLowerCase().replace('_', '-');
        try (InputStream in = SchemaGameValidatorTest.class.getResourceAsStream("/dsl-examples/" + file + ".json")) {
            return (ObjectNode) MAPPER.readTree(in);
        }
    }

    private List<ValidationError> validate(JsonNode json, GameValidationContext context) {
        return validator.validate(context);
    }

    private static ObjectNode question(ObjectNode game, int index) {
        return (ObjectNode) ((ArrayNode) game.get("questions")).get(index);
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void acceptsEveryValidExampleAndExposesTheTypedGame(GameType type) throws IOException {
        GameValidationContext context = new GameValidationContext(example(type));

        List<ValidationError> errors = validator.validate(context);

        assertThat(errors).isEmpty();
        GameDsl game = context.getGame();
        assertThat(game).isNotNull();
        assertThat(game.gameType()).isEqualTo(type);
    }

    @Test
    void parsesQuizContentIntoRecords() throws IOException {
        GameValidationContext context = new GameValidationContext(example(GameType.QUIZ));

        validator.validate(context);

        QuizGameDsl quiz = (QuizGameDsl) context.getGame();
        assertThat(quiz.questions()).hasSize(2);
        assertThat(quiz.questions().get(0).correctOptionId()).isEqualTo("b");
        assertThat(quiz.questions().get(0).options()).hasSize(3);
    }

    @Test
    void rejectsRootThatIsNotAnObject() {
        GameValidationContext context = new GameValidationContext(MAPPER.createArrayNode());

        List<ValidationError> errors = validator.validate(context);

        assertThat(errors).extracting(ValidationError::path).containsExactly("$");
        assertThat(context.getGame()).isNull();
    }

    @Test
    void rejectsNullJson() {
        assertThat(validator.validate(new GameValidationContext(null))).hasSize(1);
    }

    @Test
    void rejectsMissingSchemaVersion() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.remove("schemaVersion");

        assertThat(validator.validate(new GameValidationContext(json)))
                .extracting(ValidationError::path).containsExactly("$.schemaVersion");
    }

    @Test
    void rejectsUnsupportedSchemaVersion() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.put("schemaVersion", "9.9.9");

        assertThat(validator.validate(new GameValidationContext(json)))
                .extracting(ValidationError::path).containsExactly("$.schemaVersion");
    }

    @Test
    void rejectsMissingGameType() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.remove("gameType");

        assertThat(validator.validate(new GameValidationContext(json)))
                .extracting(ValidationError::path).containsExactly("$.gameType");
    }

    @Test
    void rejectsUnknownGameType() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.put("gameType", "CHESS");

        assertThat(validator.validate(new GameValidationContext(json)))
                .extracting(ValidationError::path).containsExactly("$.gameType");
    }

    @Test
    void rejectsGameTypeThatIsNotAString() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.put("gameType", 7);

        assertThat(validator.validate(new GameValidationContext(json)))
                .extracting(ValidationError::path).containsExactly("$.gameType");
    }

    @Test
    void pointsToTheQuestionThatBreaksTheSchema() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        question(json, 1).remove("questionText");
        GameValidationContext context = new GameValidationContext(json);

        List<ValidationError> errors = validator.validate(context);

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).path()).isEqualTo("$.questions[1]");
        assertThat(errors.get(0).message()).contains("questionText");
        assertThat(context.getGame()).isNull();
    }

    @Test
    void reportsEveryProblemNotJustTheFirst() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        question(json, 0).remove("questionText");
        question(json, 1).put("points", 0);

        List<ValidationError> errors = validator.validate(new GameValidationContext(json));

        assertThat(errors).extracting(ValidationError::path)
                .containsExactlyInAnyOrder("$.questions[0]", "$.questions[1].points");
    }

    @Test
    void rejectsQuestionFromAnotherGameType() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.put("gameType", "MATCHING");

        assertThat(validator.validate(new GameValidationContext(json))).isNotEmpty();
    }
}
