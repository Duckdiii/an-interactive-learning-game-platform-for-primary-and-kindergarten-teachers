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
import com.aigameplatform.backend.dto.dsl.ai.MatchingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OrderingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.io.IOException;
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
    private static final AiOutputValidator AI_VALIDATOR = new AiOutputValidator(MAPPER);
    private static final GameDslRequest REQUEST = new GameDslRequest("Đếm con vật", Subject.MATH, GradeLevel.GRADE_1);
    private static final int SEEDS = 200;

    private static final GameValidationService LAYERS_1_AND_2 = GameTestFixtures.schemaAndBusinessRuleValidation(MAPPER);

    private static GameDslFactoryRegistry registry(RandomGenerator random) {
        return GameTestFixtures.factoryRegistry(random);
    }

    private static AiGameOutput aiOutput(GameType type) throws IOException {
        return AI_VALIDATOR.validate(type, GameTestFixtures.resource("/ai-output-examples/", type)).output();
    }

    private static GameDsl create(GameType type, long seed) throws IOException {
        return registry(new Random(seed)).create(type, aiOutput(type), REQUEST);
    }

    // ---- kết quả luôn hợp lệ ----

    @ParameterizedTest
    @EnumSource(value = GameType.class, mode = EnumSource.Mode.EXCLUDE, names = "CUSTOM")
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
    void thePresentationChosenByTheAiGoesIntoTheMetadataWithoutUnknownValues() throws IOException {
        var withPresentation = MAPPER.readValue("""
                {"title": "Cá con", "presentation": {"world": "ocean", "carrier": "submarine", "layout": "arc"},
                 "questions": [{"text": "Có mấy con cá?", "options": ["1", "2"], "correctIndex": 1}]}""", QuizAiOutput.class);
        var withoutPresentation = MAPPER.readValue("""
                {"questions": [{"text": "Có mấy con cá?", "options": ["1", "2"], "correctIndex": 1}]}""", QuizAiOutput.class);

        var metadata = registry(new Random(1)).create(GameType.QUIZ, withPresentation, REQUEST).metadata();

        assertThat(metadata.presentation()).isEqualTo(new com.aigameplatform.backend.dto.dsl.PresentationDsl("ocean", null, "arc"));
        assertThat(registry(new Random(1)).create(GameType.QUIZ, withoutPresentation, REQUEST).metadata().presentation()).isNull();
        assertThat(MAPPER.valueToTree(registry(new Random(1)).create(GameType.QUIZ, withoutPresentation, REQUEST)).toString())
                .doesNotContain("presentation");
    }

    @Test
    void doesNotInventImageUrlsWithoutAnAssetChosenByTheAi() throws IOException {
        // Các ví dụ không có trường asset: không được tự đoán hình theo chữ (trước đây "cho bé" ra hình con chó).
        for (GameType type : GameType.dslTypes()) {
            JsonNode json = MAPPER.valueToTree(create(type, 1));

            assertThat(json.toString()).as(type.name()).doesNotContain("imageUrl");
            if (type != GameType.QUIZ) assertThat(json.toString()).as(type.name()).doesNotContain("audioUrl");
        }
    }

    @Test
    void anAssetFromTheCatalogBecomesTheImageUrlAndAnUnknownOneIsDropped() throws IOException {
        var matching = MAPPER.readValue("""
                {"title": "Nối hình", "questions": [{"pairs": [
                  {"left": {"text": "bóng bay"}, "right": {"text": "balloon", "visualPrompt": "quả bóng bay đỏ", "asset": "fluent-object-balloon"}},
                  {"left": {"text": "mèo"}, "right": {"text": "cat", "visualPrompt": "con mèo", "asset": "khong-co-hinh-nay"}},
                  {"left": {"text": "cá"}, "right": {"text": "fish"}}]}]}""", MatchingAiOutput.class);
        var quiz = MAPPER.readValue("""
                {"title": "Đếm", "questions": [{"text": "Có mấy quả bóng bay?", "options": ["1", "2"], "correctIndex": 1,
                  "visualPrompt": "hai quả bóng bay", "asset": "fluent-object-balloon"}]}""", QuizAiOutput.class);

        var pairs = ((MatchingGameDsl) registry(new Random(1)).create(GameType.MATCHING, matching, REQUEST)).questions().get(0).pairs();
        var quizQuestion = ((QuizGameDsl) registry(new Random(1)).create(GameType.QUIZ, quiz, REQUEST)).questions().get(0);

        assertThat(pairs.get(0).right().imageUrl()).isEqualTo("/assets/fluent/object-balloon.svg");
        assertThat(pairs.get(1).right().imageUrl()).isNull();
        assertThat(pairs.get(2).right().imageUrl()).isNull();
        assertThat(quizQuestion.imageUrl()).isEqualTo("/assets/fluent/object-balloon.svg");
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
        assertThat(new GameDslRequest("x", Subject.MATH, GradeLevel.KINDERGARTEN).kindergartenAgeBand())
                .isNull();
        assertThat(new GameDslRequest("x", Subject.MATH, GradeLevel.KINDERGARTEN,
                KindergartenAgeBand.AGE_3_4).curriculumDomain()).isNull();
        assertThat(new GameDslRequest("x", Subject.MATH, GradeLevel.GRADE_1).curriculumDomain()).isNull();
        assertThatThrownBy(() -> new GameDslRequest("x", Subject.MATH, GradeLevel.GRADE_1,
                KindergartenAgeBand.AGE_3_4)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void kindergartenRequestCanCarryAnOptionalCurriculumDomain() {
        var request = new GameDslRequest("Nghe và kể chuyện", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN,
                KindergartenAgeBand.AGE_4_5, "LANGUAGE");

        assertThat(request.kindergartenAgeBand()).isEqualTo(KindergartenAgeBand.AGE_4_5);
        assertThat(request.curriculumDomain()).isEqualTo("LANGUAGE");
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
        WordScrambleAiOutput output = new WordScrambleAiOutput(List.of(new WordScrambleAiQuestion(decomposed, null, null, null)), null, null);

        WordScrambleGameDsl game = (WordScrambleGameDsl) registry(new Random(1))
                .create(GameType.WORD_SCRAMBLE, output, REQUEST);

        assertThat(game.questions().get(0).correctWord()).isEqualTo("Bò");
        assertThat(game.questions().get(0).scrambledLetters()).containsExactlyInAnyOrder("B", "ò");
    }

    @Test
    void aWordOfIdenticalLettersIsLeftAsIs() {
        WordScrambleAiOutput output = new WordScrambleAiOutput(List.of(new WordScrambleAiQuestion("AA", null, null, null)), null, null);

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
                new QuizGameDslFactory(random, GameAssetCatalogFixture.ASSETS), new QuizGameDslFactory(random, GameAssetCatalogFixture.ASSETS))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("hơn một");
        assertThatThrownBy(() -> new GameDslFactoryRegistry(List.of(new QuizGameDslFactory(random, GameAssetCatalogFixture.ASSETS))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Chưa có factory");
    }

    @Test
    void usesTheShortTitleChosenByTheAi() {
        assertThat(AbstractGameDslFactory.titleOf("  Bé đếm vịt  ", "Tạo game cho bé đếm số con vịt")).isEqualTo("Bé đếm vịt");
    }

    @Test
    void longTopicWithoutAiTitleIsCutAtAWordBoundaryWithEllipsis() {
        String topic = "Tạo trò chơi giúp học sinh lớp một luyện tập so sánh hai số trong phạm vi mười bằng các dấu lớn hơn bé hơn và bằng nhau";
        String title = AbstractGameDslFactory.titleOf(null, topic);
        assertThat(title).endsWith("…").hasSizeLessThanOrEqualTo(100);
        assertThat(topic).startsWith(title.substring(0, title.length() - 1) + " ");
    }
}
