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
import java.util.Locale;
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
        String file = type.name().toLowerCase(Locale.ROOT).replace('_', '-');
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
    @EnumSource(value = GameType.class, mode = EnumSource.Mode.EXCLUDE, names = "CUSTOM")
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

    @Test
    void quizRejectsAnIncorrectAnswerForAnExplicitArithmeticQuestion() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "2 + 3 = ?");
        first.put("correctOptionId", "a"); // option a is 2, but 2 + 3 = 5

        ValidationReport report = service.validate(game);

        assertThat(report.errors()).extracting(ValidationError::path)
                .contains("$.questions[0].correctOptionId");
    }

    @Test
    void quizAcceptsTheComputedAnswerForAnExplicitArithmeticQuestion() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "2 + 3 = ?");
        first.put("correctOptionId", "b"); // option b is 3; replace it with 5
        element(first, "options", 1).put("text", "5");

        assertThat(service.validate(game).errors()).isEmpty();
    }

    @Test
    void quizRejectsMultipleOptionsThatAreBothCorrectForAnArithmeticQuestion() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "2 + 3 = ?");
        first.put("correctOptionId", "b");
        element(first, "options", 0).put("text", "5");
        element(first, "options", 1).put("text", "05");

        ValidationReport report = service.validate(game);

        assertThat(report.errors()).extracting(ValidationError::path).contains("$.questions[0].options");
    }

    @Test
    void quizRejectsAnAmbiguousPromptContainingMoreThanOneArithmeticExpression() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "2 + 3 = 5. Now 4 + 4 = ?");
        first.put("correctOptionId", "b");
        element(first, "options", 1).put("text", "5");

        ValidationReport report = service.validate(game);

        assertThat(report.errors()).extracting(ValidationError::path).contains("$.questions[0].questionText");
    }

    @Test
    void quizRejectsAChainedArithmeticExpressionInsteadOfCheckingOnlyItsFirstPair() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "3 + 2 + 1 = ?");
        first.put("correctOptionId", "b");
        element(first, "options", 1).put("text", "5");

        ValidationReport report = service.validate(game);

        assertThat(report.errors()).extracting(ValidationError::path).contains("$.questions[0].questionText");
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
    void matchingSidesOfAPairMustDifferNotJustInCase() throws IOException {
        assertThat(errorPaths(GameType.MATCHING, g ->
                ((ObjectNode) element(question(g, 0), "pairs", 1).get("right")).put("text", "Dog")))
                .containsExactly("$.questions[0].pairs[1].right");
    }

    @Test
    void quizRejectsAFillInTheBlankWhoseHintAlreadyContainsTheAnswer() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> {
            ObjectNode first = question(g, 0);
            first.put("questionText", "Điền vần còn thiếu: th... gỗ (để có từ 'than gỗ')");
            element(first, "options", 1).put("text", "an");
        })).containsExactly("$.questions[0].questionText");
    }

    @Test
    void quizRejectsAudioThatSaysTheAnswerOfABlank() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> comparison(question(g, 0), "Bé chọn dấu thích hợp: 3 nhỏ hơn 8")))
                .containsExactly("$.questions[0].audioText");
    }

    @Test
    void quizAllowsAudioThatOnlyReadsTheQuestion() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        comparison(question(game, 0), "Bé chọn dấu thích hợp: 3 mấy 8");

        assertThat(service.validate(game).errors()).isEmpty();
    }

    @Test
    void quizRejectsAudioThatSaysAnEqualsAnswerOrASymbolGluedToNumbers() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> {
            ObjectNode first = question(g, 0);
            comparison(first, "Năm bằng năm");
            first.put("questionText", "Bé chọn dấu thích hợp: 5 ... 5");
            first.put("correctOptionId", "c");
        })).containsExactly("$.questions[0].audioText");
        assertThat(errorPaths(GameType.QUIZ, g -> comparison(question(g, 0), "Bé chọn dấu: 3<8"))).containsExactly("$.questions[0].audioText");
    }

    @Test
    void quizAllowsAudioThatReadsTheChoicesOrRepeatsANumberAlreadyInTheQuestion() throws IOException {
        ObjectNode choices = example(GameType.QUIZ);
        comparison(question(choices, 0), "Bé chọn dấu lớn hơn, bé hơn hay bằng cho 3 và 8");
        assertThat(service.validate(choices).errors()).isEmpty();

        ObjectNode number = example(GameType.QUIZ);
        ObjectNode first = question(number, 0);
        first.put("questionText", "Số liền trước của 4 là ...");
        first.put("audioText", "Số liền trước của 4 là số mấy?");
        element(first, "options", 0).put("text", "5");
        element(first, "options", 1).put("text", "3");
        element(first, "options", 2).put("text", "4");
        first.put("correctOptionId", "b");
        assertThat(service.validate(number).errors()).isEmpty();
    }

    @Test
    void quizRejectsANumberCardIllustrationThatIsTheAnswerOfACountingQuestion() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> counting(question(g, 0), "3 con vịt", "/assets/numbers/number-3.svg")))
                .containsExactly("$.questions[0].imageUrl");
    }

    @Test
    void quizRejectsTheNumberCardEvenWhenTheCountingPromptSaysQuantityOrHasNoPrompt() throws IOException {
        // "số lượng" là câu đếm, không phải câu nhận biết chữ số; thiếu mô tả hình cũng vẫn là thẻ số lộ đáp án.
        assertThat(errorPaths(GameType.QUIZ, g -> counting(question(g, 0), "Số lượng 3 con vịt", "/assets/numbers/number-3.svg")))
                .containsExactly("$.questions[0].imageUrl");
        assertThat(errorPaths(GameType.QUIZ, g -> {
            counting(question(g, 0), "3 con vịt", "/assets/numbers/number-3.svg");
            question(g, 0).remove("visualPrompt");
        })).containsExactly("$.questions[0].imageUrl");
    }

    @Test
    void quizAllowsANumberCardWhenTheQuestionIsAboutTheNumberItself() throws IOException {
        for (String prompt : List.of("chữ số 3 to", "Số 3 màu xanh")) {
            ObjectNode game = example(GameType.QUIZ);
            counting(question(game, 0), prompt, "/assets/numbers/number-3.svg");

            assertThat(service.validate(game).errors()).as(prompt).isEmpty();
        }
    }

    @Test
    void quizAllowsAnObjectIllustrationOrANumberCardThatIsNotTheAnswer() throws IOException {
        ObjectNode object = example(GameType.QUIZ);
        counting(question(object, 0), "3 con vịt", "/assets/animals/duck.svg");
        assertThat(service.validate(object).errors()).isEmpty();

        ObjectNode other = example(GameType.QUIZ);
        counting(question(other, 0), "3 con vịt", "/assets/numbers/number-2.svg");
        assertThat(service.validate(other).errors()).isEmpty();
    }

    @Test
    void quizRejectsACountingQuestionWhoseImageShowsAnotherNumberThanTheAnswer() throws IOException {
        // Lỗi thật ở kịch bản 001, thử nghiệm lần 5: mô tả "Hai con vịt" nhưng đáp án đúng là 3.
        assertThat(errorPaths(GameType.QUIZ, g -> counting(question(g, 0), "Hai con vịt", "/assets/animals/duck.svg")))
                .containsExactly("$.questions[0].correctOptionId");
        assertThat(errorPaths(GameType.QUIZ, g -> counting(question(g, 0), "2 con vịt", "/assets/animals/duck.svg")))
                .containsExactly("$.questions[0].correctOptionId");
    }

    @Test
    void quizAllowsACountingQuestionWhoseImageMatchesTheAnswerOrWhoseQuestionAddsOrCompares() throws IOException {
        ObjectNode same = example(GameType.QUIZ);
        counting(question(same, 0), "Ba con vịt", "/assets/animals/duck.svg");
        assertThat(service.validate(same).errors()).isEmpty();

        // Có phép thêm: số trong hình không phải đáp án.
        ObjectNode adds = example(GameType.QUIZ);
        counting(question(adds, 0), "2 con vịt", "/assets/animals/duck.svg");
        question(adds, 0).put("questionText", "Có 2 con vịt, thêm 1 con nữa, hỏi có bao nhiêu con vịt?");
        assertThat(service.validate(adds).errors()).isEmpty();
    }

    /** Câu đếm với ba lựa chọn 1, 2, 3 (đúng là 3) và hình minh họa tuỳ ý. */
    private static void counting(ObjectNode question, String visualPrompt, String imageUrl) {
        question.put("questionText", "Có bao nhiêu con vịt?");
        question.put("visualPrompt", visualPrompt);
        question.put("imageUrl", imageUrl);
        element(question, "options", 0).put("text", "1");
        element(question, "options", 1).put("text", "2");
        element(question, "options", 2).put("text", "3");
        question.put("correctOptionId", "c");
    }

    /** Câu so sánh "3 ... 8" có đáp án "<" (lựa chọn b) và lời đọc cho trước. */
    private static void comparison(ObjectNode question, String audioText) {
        question.put("questionText", "Bé chọn dấu thích hợp: 3 ... 8");
        question.put("audioText", audioText);
        element(question, "options", 0).put("text", ">");
        element(question, "options", 1).put("text", "<");
        element(question, "options", 2).put("text", "=");
        question.put("correctOptionId", "b");
    }

    @Test
    void quizAllowsAskingTheRhymeOfAQuotedWordWhenThereIsNoBlank() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "Tiếng 'than' có vần gì?");
        element(first, "options", 1).put("text", "an");

        assertThat(service.validate(game).errors()).isEmpty();
    }

    @Test
    void matchingAllowsUppercaseToLowercaseOfASingleLetter() throws IOException {
        ObjectNode game = example(GameType.MATCHING);
        ObjectNode pair = element(question(game, 0), "pairs", 1);
        ((ObjectNode) pair.get("left")).put("text", "Ă");
        ((ObjectNode) pair.get("right")).put("text", "ă");

        assertThat(service.validate(game).errors()).isEmpty();
    }

    @Test
    void quizAllowsAOneLetterBlankWhenTheHintDoesNotShowTheCompletedWord() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        ObjectNode first = question(game, 0);
        first.put("questionText", "Điền chữ còn thiếu vào 'co...' để gọi tên con vật đang bơi");
        element(first, "options", 1).put("text", "n");

        assertThat(service.validate(game).errors()).isEmpty();
    }

    @Test
    void quizAllowsTrueFalseQuestionsThatShareTheSameAnswer() throws IOException {
        ObjectNode game = example(GameType.QUIZ);
        for (int i = 0; i < 2; i++) {
            element(question(game, i), "options", 0).put("text", "Đúng");
            element(question(game, i), "options", 1).put("text", "Sai");
            question(game, i).put("correctOptionId", "a");
        }
        ((ArrayNode) question(game, 0).get("options")).remove(2);
        ObjectNode third = question(game, 1).deepCopy();
        third.put("id", "q3");
        third.put("questionText", "Con gà có hai chân?");
        ((ArrayNode) game.get("questions")).add(third);

        assertThat(service.validate(game).errors()).isEmpty();
    }

    @Test
    void quizRejectsARepeatedQuestion() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> {
            ObjectNode copy = question(g, 0).deepCopy();
            copy.put("id", "q3");
            ((ArrayNode) g.get("questions")).add(copy);
        })).containsExactly("$.questions[2].questionText");
    }

    @Test
    void quizRejectsTheSameCorrectAnswerInEveryQuestion() throws IOException {
        assertThat(errorPaths(GameType.QUIZ, g -> {
            element(question(g, 1), "options", 0).put("text", "3");
            ObjectNode third = question(g, 0).deepCopy();
            third.put("id", "q3");
            third.put("questionText", "Có mấy con gà?");
            ((ArrayNode) g.get("questions")).add(third);
        })).containsExactly("$.questions");
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
