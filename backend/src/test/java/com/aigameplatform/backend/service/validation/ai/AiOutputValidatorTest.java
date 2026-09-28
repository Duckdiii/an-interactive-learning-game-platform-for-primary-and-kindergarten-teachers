package com.aigameplatform.backend.service.validation.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.dto.dsl.ai.AudioVisualMatchAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.DragDropAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.MatchingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.MemoryCardAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OrderingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.SpotTheTargetAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class AiOutputValidatorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static final Map<GameType, Class<? extends AiGameOutput>> EXPECTED = Map.of(
            GameType.QUIZ, QuizAiOutput.class,
            GameType.AUDIO_VISUAL_MATCH, AudioVisualMatchAiOutput.class,
            GameType.ODD_ONE_OUT, OddOneOutAiOutput.class,
            GameType.SPOT_THE_TARGET, SpotTheTargetAiOutput.class,
            GameType.WORD_SCRAMBLE, WordScrambleAiOutput.class,
            GameType.MATCHING, MatchingAiOutput.class,
            GameType.MEMORY_CARD, MemoryCardAiOutput.class,
            GameType.DRAG_DROP, DragDropAiOutput.class,
            GameType.ORDERING, OrderingAiOutput.class,
            GameType.VISUAL_CLOZE, VisualClozeAiOutput.class);

    private final AiOutputValidator validator = new AiOutputValidator(MAPPER);

    private static String exampleText(GameType type) throws IOException {
        String file = type.name().toLowerCase(Locale.ROOT).replace('_', '-');
        try (InputStream in = AiOutputValidatorTest.class.getResourceAsStream("/ai-output-examples/" + file + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static ObjectNode question(ObjectNode root, int index) {
        return (ObjectNode) ((ArrayNode) root.get("questions")).get(index);
    }

    private AiOutputReport validate(GameType type, ObjectNode json) {
        return validator.validate(type, json.toString());
    }

    // ---- ví dụ hợp lệ ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyExampleIsValidAndReadIntoTheRightRecord(GameType type) throws IOException {
        AiOutputReport report = validator.validate(type, exampleText(type));

        assertThat(report.errors()).isEmpty();
        assertThat(report.output()).isInstanceOf(EXPECTED.get(type));
        assertThat(report.output().questions()).isNotEmpty();
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void anExampleIsRejectedByTheSchemaOfAnotherGameType(GameType type) throws IOException {
        GameType other = GameType.values()[(type.ordinal() + 1) % GameType.values().length];

        assertThat(validator.validate(other, exampleText(type)).valid()).isFalse();
    }

    @Test
    void quizKeepsTheShapeOfTheGeminiSpike() throws IOException {
        QuizAiOutput quiz = (QuizAiOutput) validator.validate(GameType.QUIZ, exampleText(GameType.QUIZ)).output();

        assertThat(quiz.questions().get(0).text()).isEqualTo("Có mấy con mèo?");
        assertThat(quiz.questions().get(0).options()).containsExactly("2", "3", "4");
        assertThat(quiz.questions().get(0).correctIndex()).isEqualTo(1);
    }

    // ---- JSON hỏng ----

    @Test
    void malformedBlankAndFencedJsonAreReported() {
        assertThat(validator.validate(GameType.QUIZ, "{ \"questions\": [").errors()).hasSize(1);
        assertThat(validator.validate(GameType.QUIZ, "  ").valid()).isFalse();
        assertThat(validator.validate(GameType.QUIZ, null).valid()).isFalse();
        assertThat(validator.validate(GameType.QUIZ, "```json\n{\"questions\":[]}\n```").valid()).isFalse();
    }

    // ---- vi phạm schema ----

    @Test
    void rejectsIdsAndOtherFieldsTheAiMustNotProduce() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.QUIZ));
        question(json, 0).put("id", "q1");
        question(json, 0).put("points", 10);

        AiOutputReport report = validate(GameType.QUIZ, json);

        assertThat(report.valid()).isFalse();
        assertThat(report.errors()).extracting(ValidationError::path).containsOnly("$.questions[0]");
        assertThat(report.errors()).extracting(ValidationError::message).anyMatch(m -> m.contains("id"));
    }

    @Test
    void rejectsMissingRequiredField() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.QUIZ));
        question(json, 1).remove("correctIndex");

        AiOutputReport report = validate(GameType.QUIZ, json);

        assertThat(report.errors()).hasSize(1);
        assertThat(report.errors().get(0).path()).isEqualTo("$.questions[1]");
        assertThat(report.errors().get(0).message()).contains("correctIndex");
    }

    @Test
    void rejectsAnEmptyQuestionList() {
        assertThat(validator.validate(GameType.QUIZ, "{\"questions\":[]}").valid()).isFalse();
    }

    @Test
    void rejectsTooManyOptions() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.QUIZ));
        ((ArrayNode) question(json, 0).get("options")).add("5").add("6");

        assertThat(validate(GameType.QUIZ, json).valid()).isFalse();
    }

    @Test
    void rejectsTextThatIsTooLong() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.QUIZ));
        question(json, 0).put("text", "x".repeat(201));

        assertThat(validate(GameType.QUIZ, json).valid()).isFalse();
    }

    @Test
    void rejectsExtraTopLevelProperties() {
        assertThat(validator.validate(GameType.QUIZ, "{\"questions\":[],\"gameType\":\"QUIZ\"}").valid()).isFalse();
    }

    // ---- chỉ số vượt phạm vi (schema không diễn tả được) ----

    @Test
    void quizCorrectIndexMustPointToAnOption() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.QUIZ));
        question(json, 1).put("correctIndex", 3);

        AiOutputReport report = validate(GameType.QUIZ, json);

        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.questions[1]");
        assertThat(report.errors().get(0).message()).contains("correctIndex");
        assertThat(report.output()).isNull();
    }

    @Test
    void oddOneOutIndexMustPointToAnItem() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.ODD_ONE_OUT));
        question(json, 1).put("oddOneOutIndex", 4);

        assertThat(validate(GameType.ODD_ONE_OUT, json).errors())
                .extracting(ValidationError::path).containsExactly("$.questions[1]");
    }

    @Test
    void dragDropZoneIndexMustPointToAZone() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.DRAG_DROP));
        ObjectNode item = (ObjectNode) ((ArrayNode) question(json, 0).get("items")).get(1);
        item.put("zoneIndex", 3);

        AiOutputReport report = validate(GameType.DRAG_DROP, json);

        assertThat(report.errors()).hasSize(1);
        assertThat(report.errors().get(0).message()).contains("items[1].zoneIndex");
    }

    @Test
    void reportsEveryIndexProblemNotJustTheFirst() throws IOException {
        ObjectNode json = (ObjectNode) MAPPER.readTree(exampleText(GameType.QUIZ));
        question(json, 0).put("correctIndex", 3);
        question(json, 1).put("correctIndex", 2);

        assertThat(validate(GameType.QUIZ, json).errors())
                .extracting(ValidationError::path).containsExactly("$.questions[0]", "$.questions[1]");
    }
}
