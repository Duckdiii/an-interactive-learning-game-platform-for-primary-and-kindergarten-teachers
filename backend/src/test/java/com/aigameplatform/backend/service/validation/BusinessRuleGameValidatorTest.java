package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.rule.AbstractGameRule;
import com.aigameplatform.backend.service.validation.rule.AudioVisualMatchRule;
import com.aigameplatform.backend.service.validation.rule.DragDropRule;
import com.aigameplatform.backend.service.validation.rule.MatchingRule;
import com.aigameplatform.backend.service.validation.rule.MemoryCardRule;
import com.aigameplatform.backend.service.validation.rule.OddOneOutRule;
import com.aigameplatform.backend.service.validation.rule.OrderingRule;
import com.aigameplatform.backend.service.validation.rule.QuizRule;
import com.aigameplatform.backend.service.validation.rule.VisualClozeRule;
import com.aigameplatform.backend.service.validation.rule.WordScrambleRule;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Chạy qua cả Layer 1 và Layer 2: mỗi ca sai phải lọt Layer 1 (đúng cú pháp) rồi bị Layer 2 chặn. */
class BusinessRuleGameValidatorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslSchemaRegistry REGISTRY = new GameDslSchemaRegistry();

    private static List<AbstractGameRule<?, ?>> allRules() {
        return List.of(new QuizRule(), new AudioVisualMatchRule(), new OddOneOutRule(), new WordScrambleRule(),
                new MatchingRule(), new MemoryCardRule(), new DragDropRule(), new OrderingRule(), new VisualClozeRule());
    }

    private final GameValidationService service = new GameValidationService(
            List.of(new SchemaGameValidator(REGISTRY, MAPPER), new BusinessRuleGameValidator(allRules())), MAPPER);

    private static ObjectNode example(GameType type) throws IOException {
        String file = type.name().toLowerCase().replace('_', '-');
        try (InputStream in = BusinessRuleGameValidatorTest.class.getResourceAsStream("/dsl-examples/" + file + ".json")) {
            return (ObjectNode) MAPPER.readTree(in);
        }
    }

    private List<String> errorPaths(GameType type, Consumer<ObjectNode> mutation) throws IOException {
        ObjectNode json = example(type);
        mutation.accept(json);
        ValidationReport report = service.validate(json);
        assertThat(report.valid()).as("JSON sai phải bị chặn").isFalse();
        return report.errors().stream().map(ValidationError::path).toList();
    }

    private static ObjectNode question(ObjectNode game, int index) {
        return (ObjectNode) ((ArrayNode) game.get("questions")).get(index);
    }

    private static ObjectNode element(ObjectNode question, String list, int index) {
        return (ObjectNode) ((ArrayNode) question.get(list)).get(index);
    }

    // ---- ví dụ hợp lệ ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyExamplePassesBothLayers(GameType type) throws IOException {
        ValidationReport report = service.validate(example(type));

        assertThat(report.errors()).isEmpty();
        assertThat(report.game().gameType()).isEqualTo(type);
    }

    // ---- kiểm tra chung ----

    @Test
    void rejectsDuplicateQuestionIds() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> question(g, 1).put("id", "q1")))
                .containsExactly("$.questions[1].id");
    }

    @Test
    void rejectsTextThatIsOnlyWhitespace() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> ((ObjectNode) g.get("metadata")).put("title", "   ")))
                .containsExactly("$.metadata.title");
    }

    @Test
    void rejectsBlankAudioUrl() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> question(g, 0).put("imageUrl", " ")))
                .containsExactly("$.questions[0].imageUrl");
    }

    @Test
    void reportsErrorsFromSeveralQuestionsTogether() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> {
            question(g, 0).put("correctOptionId", "d");
            question(g, 1).put("correctOptionId", "d");
        })).containsExactlyInAnyOrder("$.questions[0].correctOptionId", "$.questions[1].correctOptionId");
    }

    // ---- QUIZ ----

    @Test
    void quizCorrectOptionMustBeOneOfTheOptions() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> question(g, 0).put("correctOptionId", "d")))
                .containsExactly("$.questions[0].correctOptionId");
    }

    @Test
    void quizOptionIdsMustFollowPosition() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> element(question(g, 0), "options", 1).put("id", "c")))
                .containsExactlyInAnyOrder("$.questions[0].options[1].id", "$.questions[0].correctOptionId");
    }

    @Test
    void quizOptionTextsMustBeDistinctIgnoringCaseAndSpaces() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> element(question(g, 0), "options", 1).put("text", "  2 ")))
                .containsExactly("$.questions[0].options[1].text");
    }

    // ---- ODD_ONE_OUT ----

    @Test
    void oddOneOutIdMustBeOneOfTheItems() throws IOException {
        assertThat(errorPaths(GameType.ODD_ONE_OUT, g -> question(g, 0).put("oddOneOutId", "e")))
                .containsExactly("$.questions[0].oddOneOutId");
    }

    @Test
    void oddOneOutItemTextsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.ODD_ONE_OUT, g -> element(question(g, 0), "items", 1).put("text", "MÈO")))
                .containsExactly("$.questions[0].items[1].text");
    }

    // ---- AUDIO_VISUAL_MATCH ----

    @Test
    void audioVisualDistractorMustDifferFromTheCorrectImage() throws IOException {
        assertThat(errorPaths(GameType.AUDIO_VISUAL_MATCH, g ->
                ((ObjectNode) ((ArrayNode) question(g, 0).get("distractors")).get(0)).put("visualPrompt", "Apple")))
                .containsExactly("$.questions[0].distractors[0].visualPrompt");
    }

    @Test
    void audioVisualDistractorsMustDifferFromEachOther() throws IOException {
        assertThat(errorPaths(GameType.AUDIO_VISUAL_MATCH, g ->
                ((ObjectNode) ((ArrayNode) question(g, 0).get("distractors")).get(1)).put("visualPrompt", "BANANA")))
                .containsExactly("$.questions[0].distractors[1].visualPrompt");
    }

    // ---- SPOT_THE_TARGET ----

    @Test
    void spotTheTargetAllowsADraftWithoutHitRegion() throws IOException {
        // Ví dụ có q2 không có hitRegion và vẫn hợp lệ (đã kiểm tra ở test "everyExamplePassesBothLayers").
        assertThat(example(GameType.SPOT_THE_TARGET).get("questions").get(1).has("hitRegion")).isFalse();
    }

    @Test
    void spotTheTargetDescriptionMustNotBeBlank() throws IOException {
        assertThat(errorPaths(GameType.SPOT_THE_TARGET, g -> question(g, 0).put("targetDescription", "  ")))
                .containsExactly("$.questions[0].targetDescription");
    }

    // ---- WORD_SCRAMBLE ----

    @Test
    void scrambledLettersMustBeTheLettersOfTheWord() throws IOException {
        assertThat(errorPaths(GameType.WORD_SCRAMBLE, g -> {
            ArrayNode letters = (ArrayNode) question(g, 0).get("scrambledLetters");
            letters.removeAll();
            letters.add("B").add("O");
        })).containsExactly("$.questions[0].scrambledLetters");
    }

    @Test
    void scrambledLettersMustNotKeepTheOriginalOrder() throws IOException {
        assertThat(errorPaths(GameType.WORD_SCRAMBLE, g -> {
            ArrayNode letters = (ArrayNode) question(g, 0).get("scrambledLetters");
            letters.removeAll();
            letters.add("B").add("Ò");
        })).containsExactly("$.questions[0].scrambledLetters");
    }

    @Test
    void scrambledLettersComparisonIgnoresCase() throws IOException {
        ObjectNode json = example(GameType.WORD_SCRAMBLE);
        ArrayNode letters = (ArrayNode) question(json, 0).get("scrambledLetters");
        letters.removeAll();
        letters.add("ò").add("b");

        assertThat(service.validate(json).valid()).isTrue();
    }

    @Test
    void aWordOfIdenticalLettersCannotBeReordered() throws IOException {
        ObjectNode json = example(GameType.WORD_SCRAMBLE);
        question(json, 1).put("correctWord", "AA");
        ArrayNode letters = (ArrayNode) question(json, 1).get("scrambledLetters");
        letters.removeAll();
        letters.add("A").add("A");

        assertThat(service.validate(json).valid()).isTrue();
    }

    // ---- MATCHING ----

    @Test
    void matchingLeftSidesMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.MATCHING, g ->
                ((ObjectNode) element(question(g, 0), "pairs", 1).get("left")).put("text", "Apple")))
                .containsExactly("$.questions[0].pairs[1].left");
    }

    @Test
    void matchingRightSidesMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.MATCHING, g ->
                ((ObjectNode) element(question(g, 0), "pairs", 2).get("right")).put("text", "chó")))
                .containsExactly("$.questions[0].pairs[2].right");
    }

    @Test
    void matchingPairIdsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.MATCHING, g -> element(question(g, 0), "pairs", 1).put("pairId", "p1")))
                .containsExactly("$.questions[0].pairs[1].pairId");
    }

    // ---- MEMORY_CARD ----

    @Test
    void memoryPairIdsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.MEMORY_CARD, g -> element(question(g, 0), "pairs", 1).put("pairId", "p1")))
                .containsExactly("$.questions[0].pairs[1].pairId");
    }

    @Test
    void memoryPairContentsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.MEMORY_CARD, g -> {
            ObjectNode content = (ObjectNode) element(question(g, 0), "pairs", 1).get("content");
            content.removeAll();
            content.put("visualPrompt", "apple");
        })).containsExactly("$.questions[0].pairs[1].content");
    }

    // ---- DRAG_DROP ----

    @Test
    void dragDropItemMustTargetAnExistingZone() throws IOException {
        assertThat(errorPaths(GameType.DRAG_DROP, g -> element(question(g, 0), "items", 1).put("targetZoneId", "z9")))
                .containsExactlyInAnyOrder("$.questions[0].items[1].targetZoneId", "$.questions[0].dropZones[1]");
    }

    @Test
    void dragDropEveryZoneNeedsAnItem() throws IOException {
        assertThat(errorPaths(GameType.DRAG_DROP, g -> element(question(g, 0), "items", 1).put("targetZoneId", "z1")))
                .containsExactly("$.questions[0].dropZones[1]");
    }

    @Test
    void dragDropZoneLabelsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.DRAG_DROP, g -> element(question(g, 0), "dropZones", 1).put("label", "trái cây")))
                .containsExactly("$.questions[0].dropZones[1].label");
    }

    @Test
    void dragDropItemIdsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.DRAG_DROP, g -> element(question(g, 0), "items", 1).put("id", "i1")))
                .containsExactly("$.questions[0].items[1].id");
    }

    // ---- ORDERING ----

    @Test
    void orderingPositionsMustStayWithinTheStepCount() throws IOException {
        assertThat(errorPaths(GameType.ORDERING, g -> element(question(g, 0), "steps", 2).put("correctPosition", 4)))
                .containsExactly("$.questions[0].steps[2].correctPosition");
    }

    @Test
    void orderingPositionsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.ORDERING, g -> element(question(g, 0), "steps", 2).put("correctPosition", 2)))
                .containsExactly("$.questions[0].steps[2].correctPosition");
    }

    @Test
    void orderingStepTextsMustBeDistinct() throws IOException {
        assertThat(errorPaths(GameType.ORDERING, g -> element(question(g, 0), "steps", 1).put("text", "gieo hạt")))
                .containsExactly("$.questions[0].steps[1].text");
    }

    // ---- VISUAL_CLOZE ----

    @Test
    void clozeNeedsExactlyOneBlank() throws IOException {
        assertThat(errorPaths(GameType.VISUAL_CLOZE, g -> question(g, 0).put("sentenceTemplate", "Con ___ kêu ___.")))
                .containsExactly("$.questions[0].sentenceTemplate");
    }

    @Test
    void clozeBlankMustBeExactlyThreeUnderscores() throws IOException {
        assertThat(errorPaths(GameType.VISUAL_CLOZE, g -> question(g, 0).put("sentenceTemplate", "Con ____ kêu meo meo.")))
                .containsExactly("$.questions[0].sentenceTemplate");
    }

    @Test
    void clozeDistractorMustDifferFromTheAnswer() throws IOException {
        assertThat(errorPaths(GameType.VISUAL_CLOZE, g ->
                ((ArrayNode) question(g, 0).get("distractors")).set(0, MAPPER.getNodeFactory().stringNode("Mèo"))))
                .containsExactly("$.questions[0].distractors[0]");
    }

    // ---- validator ----

    @Test
    void rejectsTwoRulesForTheSameGameType() {
        assertThatThrownBy(() -> new BusinessRuleGameValidator(List.of(new QuizRule(), new QuizRule())))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void doesNotRunWhenLayer1Fails() throws IOException {
        ObjectNode json = example(GameType.QUIZ);
        json.remove("gameType");

        ValidationReport report = service.validate((JsonNode) json);

        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.gameType");
    }
}
