package com.aigameplatform.backend.service.factory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.DragDropGameDsl;
import com.aigameplatform.backend.dto.dsl.DragDropQuestionDsl;
import com.aigameplatform.backend.dto.dsl.DraggableItemDsl;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.MatchingGameDsl;
import com.aigameplatform.backend.dto.dsl.MemoryCardGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.OrderStepDsl;
import com.aigameplatform.backend.dto.dsl.OrderingGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.SpotTheTargetGameDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.WordScrambleGameDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.dto.dsl.ai.DragDropAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OrderingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.BusinessRuleGameValidator;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.SchemaGameValidator;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
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
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GameDslFactoryTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslSchemaRegistry SCHEMAS = new GameDslSchemaRegistry();
    private static final AiOutputValidator AI_VALIDATOR = new AiOutputValidator(MAPPER);
    private static final GameDslRequest REQUEST = new GameDslRequest("Đếm con vật", Subject.MATH, GradeLevel.GRADE_1);
    private static final int SEEDS = 200;

    private static final GameValidationService LAYERS_1_AND_2 = new GameValidationService(List.<AbstractGameValidator>of(
            new SchemaGameValidator(SCHEMAS, MAPPER), new BusinessRuleGameValidator(rules())), MAPPER);

    private static List<AbstractGameRule<?, ?>> rules() {
        return List.of(new QuizRule(), new AudioVisualMatchRule(), new OddOneOutRule(), new WordScrambleRule(),
                new MatchingRule(), new MemoryCardRule(), new DragDropRule(), new OrderingRule(), new VisualClozeRule());
    }

    private static GameDslFactoryRegistry registry(RandomGenerator random) {
        return new GameDslFactoryRegistry(List.of(
                new QuizGameDslFactory(random), new AudioVisualMatchGameDslFactory(random),
                new OddOneOutGameDslFactory(random), new SpotTheTargetGameDslFactory(random),
                new WordScrambleGameDslFactory(random), new MatchingGameDslFactory(random),
                new MemoryCardGameDslFactory(random), new DragDropGameDslFactory(random),
                new OrderingGameDslFactory(random), new VisualClozeGameDslFactory(random)));
    }

    private static AiGameOutput aiOutput(GameType type) throws IOException {
        String file = type.name().toLowerCase().replace('_', '-');
        try (InputStream in = GameDslFactoryTest.class.getResourceAsStream("/ai-output-examples/" + file + ".json")) {
            return AI_VALIDATOR.validate(type, new String(in.readAllBytes(), StandardCharsets.UTF_8)).output();
        }
    }

    private static GameDsl create(GameType type, long seed) throws IOException {
        return registry(new Random(seed)).create(type, aiOutput(type), REQUEST);
    }

    // ---- kết quả luôn hợp lệ ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyExampleBecomesAValidGameForManyRandomShuffles(GameType type) throws IOException {
        AiGameOutput output = aiOutput(type);
        for (long seed = 0; seed < SEEDS; seed++) {
            GameDsl game = registry(new Random(seed)).create(type, output, REQUEST);

            ValidationReport report = LAYERS_1_AND_2.validate(MAPPER.valueToTree(game));

            assertThat(report.errors()).as("%s, hạt giống %d", type, seed).isEmpty();
            assertThat(game.gameType()).isEqualTo(type);
        }
    }

    // ---- vỏ và giá trị mặc định ----

    @Test
    void fillsTheEnvelopeAndDefaults() throws IOException {
        QuizGameDsl game = (QuizGameDsl) create(GameType.QUIZ, 1);

        assertThat(game.schemaVersion()).isEqualTo("1.0.0");
        assertThat(game.metadata().title()).isEqualTo("Đếm con vật");
        assertThat(game.metadata().topic()).isEqualTo("Đếm con vật");
        assertThat(game.metadata().subject()).isEqualTo(Subject.MATH);
        assertThat(game.metadata().gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(game.gameplaySettings().hitboxScale()).isEqualTo(1.5);
        assertThat(game.questions()).extracting(QuizQuestionDsl::id).containsExactly("q1", "q2");
        assertThat(game.questions()).extracting(QuizQuestionDsl::timeLimitSeconds).containsOnly(38);
        assertThat(game.questions()).extracting(QuizQuestionDsl::points).containsOnly(10);
    }

    @Test
    void doesNotInventMediaUrls() throws IOException {
        for (GameType type : GameType.values()) {
            JsonNode json = MAPPER.valueToTree(create(type, 1));

            assertThat(json.toString()).as(type.name()).doesNotContain("audioUrl").doesNotContain("imageUrl");
        }
    }

    @Test
    void longTopicsAreTruncatedByCharactersNotBytes() throws IOException {
        String topic150 = "Ă".repeat(150);
        String topic250 = "ế".repeat(250);
        GameDslFactoryRegistry registry = registry(new Random(1));

        GameDsl shortEnough = registry.create(GameType.QUIZ, aiOutput(GameType.QUIZ),
                new GameDslRequest(topic150, Subject.MATH, GradeLevel.GRADE_2));
        GameDsl tooLong = registry.create(GameType.QUIZ, aiOutput(GameType.QUIZ),
                new GameDslRequest(topic250, Subject.MATH, GradeLevel.GRADE_2));

        assertThat(shortEnough.metadata().title()).hasSize(100);
        assertThat(shortEnough.metadata().topic()).hasSize(150);
        assertThat(tooLong.metadata().title()).hasSize(100);
        assertThat(tooLong.metadata().topic()).hasSize(200);
        assertThat(LAYERS_1_AND_2.validate(MAPPER.valueToTree(tooLong)).valid()).isTrue();
    }

    @Test
    void rejectsAnIncompleteRequest() {
        assertThatThrownBy(() -> new GameDslRequest(" ", Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new GameDslRequest("x", null, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new GameDslRequest("x", Subject.MATH, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsAnAiOutputOfAnotherGameType() throws IOException {
        GameDslFactoryRegistry registry = registry(new Random(1));
        AiGameOutput matching = aiOutput(GameType.MATCHING);

        assertThatThrownBy(() -> registry.create(GameType.QUIZ, matching, REQUEST))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("QUIZ");
    }

    // ---- QUIZ ----

    @Test
    void quizKeepsTheCorrectAnswerAfterShuffling() throws IOException {
        QuizAiOutput original = (QuizAiOutput) aiOutput(GameType.QUIZ);
        Set<String> correctPositions = new HashSet<>();

        for (long seed = 0; seed < SEEDS; seed++) {
            QuizGameDsl game = (QuizGameDsl) create(GameType.QUIZ, seed);
            for (int q = 0; q < game.questions().size(); q++) {
                QuizQuestionDsl question = game.questions().get(q);
                var ai = original.questions().get(q);

                assertThat(question.options()).extracting(TextChoiceDsl::text)
                        .containsExactlyInAnyOrderElementsOf(ai.options());
                assertThat(question.options()).extracting(TextChoiceDsl::id)
                        .containsExactlyElementsOf(List.of("a", "b", "c", "d").subList(0, question.options().size()));
                String correctText = question.options().stream()
                        .filter(o -> o.id().equals(question.correctOptionId())).findFirst().orElseThrow().text();
                assertThat(correctText).isEqualTo(ai.options().get(ai.correctIndex()));
                if (q == 0) {
                    correctPositions.add(question.correctOptionId());
                }
            }
        }
        assertThat(correctPositions).as("đáp án đúng không được luôn ở một vị trí").hasSizeGreaterThan(1);
    }

    @Test
    void quizCarriesOverTextAndMedia() throws IOException {
        QuizQuestionDsl question = ((QuizGameDsl) create(GameType.QUIZ, 3)).questions().get(0);

        assertThat(question.questionText()).isEqualTo("Có mấy con mèo?");
        assertThat(question.visualPrompt()).isEqualTo("three cats");
        assertThat(question.audioText()).isEqualTo("Có mấy con mèo?");
    }

    // ---- ODD_ONE_OUT ----

    @Test
    void oddOneOutKeepsTheOddItemAfterShuffling() throws IOException {
        OddOneOutAiOutput original = (OddOneOutAiOutput) aiOutput(GameType.ODD_ONE_OUT);

        for (long seed = 0; seed < SEEDS; seed++) {
            OddOneOutGameDsl game = (OddOneOutGameDsl) create(GameType.ODD_ONE_OUT, seed);
            for (int q = 0; q < game.questions().size(); q++) {
                OddOneOutQuestionDsl question = game.questions().get(q);
                var ai = original.questions().get(q);
                String odd = question.items().stream()
                        .filter(i -> i.id().equals(question.oddOneOutId())).findFirst().orElseThrow().text();

                assertThat(odd).isEqualTo(ai.items().get(ai.oddOneOutIndex()));
            }
        }
    }

    // ---- WORD_SCRAMBLE ----

    @Test
    void scrambledLettersAreAPermutationDifferentFromTheWord() throws IOException {
        for (long seed = 0; seed < SEEDS; seed++) {
            WordScrambleGameDsl game = (WordScrambleGameDsl) create(GameType.WORD_SCRAMBLE, seed);

            game.questions().forEach(q -> {
                List<String> letters = q.correctWord().codePoints().mapToObj(Character::toString).toList();
                assertThat(q.scrambledLetters()).containsExactlyInAnyOrderElementsOf(letters);
                assertThat(q.scrambledLetters()).isNotEqualTo(letters);
            });
        }
    }

    @Test
    void vietnameseLettersWithDiacriticsStayWhole() {
        String decomposed = Normalizer.normalize("Bò", Normalizer.Form.NFD);
        WordScrambleAiOutput output = new WordScrambleAiOutput(List.of(new WordScrambleAiQuestion(decomposed, null, null)));

        WordScrambleGameDsl game = (WordScrambleGameDsl) registry(new Random(1))
                .create(GameType.WORD_SCRAMBLE, output, REQUEST);

        assertThat(game.questions().get(0).correctWord()).isEqualTo("Bò");
        assertThat(game.questions().get(0).scrambledLetters()).containsExactlyInAnyOrder("B", "ò");
    }

    @Test
    void aWordOfIdenticalLettersIsLeftAsIs() {
        WordScrambleAiOutput output = new WordScrambleAiOutput(List.of(new WordScrambleAiQuestion("AA", null, null)));

        WordScrambleGameDsl game = (WordScrambleGameDsl) registry(new Random(1))
                .create(GameType.WORD_SCRAMBLE, output, REQUEST);

        assertThat(game.questions().get(0).scrambledLetters()).containsExactly("A", "A");
        assertThat(LAYERS_1_AND_2.validate(MAPPER.valueToTree(game)).valid()).isTrue();
    }

    // ---- ORDERING ----

    @Test
    void orderingShowsTheStepsInADifferentOrderButRemembersTheCorrectOne() throws IOException {
        OrderingAiOutput original = (OrderingAiOutput) aiOutput(GameType.ORDERING);

        for (long seed = 0; seed < SEEDS; seed++) {
            OrderingGameDsl game = (OrderingGameDsl) create(GameType.ORDERING, seed);
            var question = game.questions().get(0);
            List<String> correctOrder = original.questions().get(0).steps().stream().map(s -> s.text()).toList();

            List<String> displayed = question.steps().stream().map(OrderStepDsl::text).toList();
            List<String> byPosition = question.steps().stream()
                    .sorted(Comparator.comparingInt(OrderStepDsl::correctPosition)).map(OrderStepDsl::text).toList();

            assertThat(displayed).isNotEqualTo(correctOrder);
            assertThat(byPosition).isEqualTo(correctOrder);
            assertThat(question.steps()).extracting(OrderStepDsl::id).containsExactly("s1", "s2", "s3");
        }
    }

    // ---- DRAG_DROP ----

    @Test
    void dragDropTranslatesZoneIndicesToZoneIds() throws IOException {
        DragDropAiOutput original = (DragDropAiOutput) aiOutput(GameType.DRAG_DROP);
        var aiQuestion = original.questions().get(0);
        Map<String, String> labelOfItem = new HashMap<>();
        aiQuestion.items().forEach(i -> labelOfItem.put(i.text(), aiQuestion.dropZones().get(i.zoneIndex()).label()));

        for (long seed = 0; seed < SEEDS; seed++) {
            DragDropGameDsl game = (DragDropGameDsl) create(GameType.DRAG_DROP, seed);
            DragDropQuestionDsl question = game.questions().get(0);
            Map<String, String> zoneLabels = new HashMap<>();
            question.dropZones().forEach(z -> zoneLabels.put(z.id(), z.label()));

            assertThat(zoneLabels).containsOnlyKeys("z1", "z2");
            List<String> itemIds = new ArrayList<>();
            for (DraggableItemDsl item : question.items()) {
                itemIds.add(item.id());
                assertThat(zoneLabels.get(item.targetZoneId())).isEqualTo(labelOfItem.get(item.text()));
            }
            assertThat(itemIds).containsExactly("i1", "i2", "i3");
        }
    }

    // ---- các loại chỉ chép và đánh id ----

    @Test
    void matchingAndMemoryGetSequentialPairIds() throws IOException {
        MatchingGameDsl matching = (MatchingGameDsl) create(GameType.MATCHING, 1);
        MemoryCardGameDsl memory = (MemoryCardGameDsl) create(GameType.MEMORY_CARD, 1);

        assertThat(matching.questions().get(0).pairs()).extracting(p -> p.pairId()).containsExactly("p1", "p2", "p3");
        assertThat(matching.questions().get(0).pairs().get(0).left().text()).isEqualTo("apple");
        assertThat(matching.questions().get(0).pairs().get(0).right().text()).isEqualTo("táo");
        assertThat(memory.questions().get(0).pairs()).extracting(p -> p.pairId()).containsExactly("p1", "p2");
        assertThat(memory.questions().get(0).pairs().get(1).content().text()).isEqualTo("chuối");
    }

    @Test
    void spotTheTargetLeavesTheHitRegionForTheTeacher() throws IOException {
        SpotTheTargetGameDsl game = (SpotTheTargetGameDsl) create(GameType.SPOT_THE_TARGET, 1);

        assertThat(game.questions().get(0).hitRegion()).isNull();
        assertThat(game.questions().get(0).targetDescription()).isEqualTo("con mèo");
        assertThat(game.questions().get(0).visualPrompt()).isEqualTo("a garden with a cat");
    }

    @Test
    void audioVisualMatchKeepsTheCorrectImageAndDistractors() throws IOException {
        AudioVisualMatchGameDsl game = (AudioVisualMatchGameDsl) create(GameType.AUDIO_VISUAL_MATCH, 1);

        assertThat(game.questions().get(0).correct().visualPrompt()).isEqualTo("apple");
        assertThat(game.questions().get(0).distractors()).extracting(d -> d.visualPrompt())
                .containsExactly("banana", "orange");
        assertThat(game.questions().get(0).audioText()).isEqualTo("Quả táo");
    }

    @Test
    void visualClozeIsCopiedAsIs() throws IOException {
        VisualClozeGameDsl game = (VisualClozeGameDsl) create(GameType.VISUAL_CLOZE, 1);

        assertThat(game.questions().get(0).sentenceTemplate()).isEqualTo("Con ___ kêu meo meo.");
        assertThat(game.questions().get(0).correctAnswer()).isEqualTo("mèo");
        assertThat(game.questions().get(0).distractors()).containsExactly("chó", "gà");
        assertThat(game.questions().get(0).visualPrompt()).isEqualTo("a cat");
    }

    // ---- registry ----

    @Test
    void registryRefusesADuplicateOrMissingFactory() {
        Random random = new Random(1);

        assertThatThrownBy(() -> new GameDslFactoryRegistry(List.of(
                new QuizGameDslFactory(random), new QuizGameDslFactory(random))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("hơn một");
        assertThatThrownBy(() -> new GameDslFactoryRegistry(List.of(new QuizGameDslFactory(random))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Chưa có factory");
    }
}
