package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.OrderStepDsl;
import com.aigameplatform.backend.dto.dsl.OrderingGameDsl;
import com.aigameplatform.backend.dto.dsl.OrderingQuestionDsl;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.SpotTheTargetQuestionDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.entity.question.OrderStep;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.entity.question.SpotTheTargetQuestion;
import com.aigameplatform.backend.service.factory.GameDslFactoryRegistry;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.factory.WordScrambleGameDslFactory;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Random;
import java.util.UUID;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ánh xạ hai chiều Game DSL và entity của 10 loại game, không cần DB. */
class GameContentStrategyMappingTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslRequest REQUEST = new GameDslRequest("Chủ đề mẫu", Subject.MATH, GradeLevel.GRADE_2);

    private static final Map<GameType, GameContentStrategy<?, ?>> STRATEGIES = GameTestFixtures.strategies(MAPPER)
            .stream().collect(Collectors.toMap(GameContentStrategy::getSupportedType, s -> s));

    private static final GameValidationService LAYERS_1_AND_2 = GameTestFixtures.schemaAndBusinessRuleValidation(MAPPER);

    private static String resource(String folder, GameType type) throws IOException {
        return GameTestFixtures.resource(folder, type);
    }

    private static Game gameOf(GameType type, List<QuestionGame> questions) {
        Game game = new Game();
        game.setTitle("Tên game");
        game.setGameType(type);
        game.setSubject(Subject.MATH);
        game.setGrade(GradeLevel.GRADE_2);
        game.setQuestions(questions);
        return game;
    }

    private static GameDslFactoryRegistry registry(RandomGenerator random) {
        return GameTestFixtures.factoryRegistry(random);
    }

    /** Ordering không lưu thứ tự hiển thị nên so sánh không phụ thuộc thứ tự bước. */
    private static void assertSameQuestions(GameType type, JsonNode expected, JsonNode actual) {
        if (type != GameType.ORDERING) {
            assertThat(actual).isEqualTo(expected);
            return;
        }
        assertThat(actual.size()).isEqualTo(expected.size());
        for (int i = 0; i < expected.size(); i++) {
            assertThat(stepsByPosition(actual.get(i))).isEqualTo(stepsByPosition(expected.get(i)));
        }
    }

    private static List<String> stepsByPosition(JsonNode question) {
        String[] byPosition = new String[question.get("steps").size()];
        for (JsonNode step : question.get("steps")) {
            byPosition[step.get("correctPosition").asInt() - 1] = step.get("text").asString();
        }
        return List.of(byPosition);
    }

    // ---- DSL -> entity ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everyExampleBecomesEntitiesOfTheRightType(GameType type) throws IOException {
        List<QuestionGame> questions = STRATEGIES.get(type).parseToQuestions(resource("/dsl-examples/", type));

        assertThat(questions).isNotEmpty();
        for (int i = 0; i < questions.size(); i++) {
            assertThat(questions.get(i).getItemIndex()).isEqualTo(i);
            assertThat(questions.get(i).getTimeLimit()).isPositive();
            assertThat(questions.get(i).getPoint()).isPositive();
            assertThat(questions.get(i).getId()).as("id do Hibernate sinh").isNull();
        }
    }

    @Test
    void quizKeepsTheCorrectAnswerAsAnIndexEvenWhenIdsAreNotInOrder() throws IOException {
        String json = resource("/dsl-examples/", GameType.QUIZ)
                .replace("\"correctOptionId\": \"a\"", "\"correctOptionId\": \"b\"");

        QuizQuestion question = (QuizQuestion) new QuizGameStrategy(MAPPER).parseToQuestions(json).get(0);

        assertThat(question.getCorrectIndex()).isEqualTo(1);
        assertThat(question.getOptions()).hasSizeGreaterThan(1);
    }

    @Test
    void anAnswerIdOutsideTheOptionsIsRejected() throws IOException {
        String json = resource("/dsl-examples/", GameType.QUIZ)
                .replace("\"correctOptionId\": \"a\"", "\"correctOptionId\": \"z\"");

        assertThatThrownBy(() -> new QuizGameStrategy(MAPPER).parseToQuestions(json))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("'z'");
    }

    @Test
    void oddOneOutKeepsItsIdAndItemTexts() throws IOException {
        OddOneOutQuestion question = (OddOneOutQuestion) new OddOneOutGameStrategy(MAPPER)
                .parseToQuestions(resource("/dsl-examples/", GameType.ODD_ONE_OUT)).get(0);

        assertThat(question.getItems()).isNotEmpty();
        assertThat(question.getOddOneOutId()).isNotBlank();
    }

    @Test
    void aSpotQuestionWithoutHitRegionStaysWithoutOne() {
        String json = "{\"schemaVersion\":\"1.0.0\",\"gameType\":\"SPOT_THE_TARGET\",\"metadata\":{\"title\":\"t\","
                + "\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"topic\":\"t\"},\"gameplaySettings\":"
                + "{\"hitboxScale\":1.5},\"questions\":[{\"id\":\"q1\",\"timeLimitSeconds\":45,\"points\":10,"
                + "\"visualPrompt\":\"garden\",\"targetDescription\":\"the cat\"}]}";
        SpotTheTargetGameStrategy strategy = new SpotTheTargetGameStrategy(MAPPER);

        SpotTheTargetQuestion entity = (SpotTheTargetQuestion) strategy.parseToQuestions(json).get(0);
        SpotTheTargetQuestionDsl back = strategy.toQuestionDsls(List.of(entity)).get(0);

        assertThat(entity.getHitRegionX()).isNull();
        assertThat(back.hitRegion()).isNull();
        assertThat(back.targetDescription()).isEqualTo("the cat");
    }

    @Test
    void aFullParsedDslCanBeUsedDirectly() throws IOException {
        GameDsl game = MAPPER.readValue(resource("/dsl-examples/", GameType.QUIZ), GameDsl.class);

        assertThat(new QuizGameStrategy(MAPPER).parseToQuestions(game)).hasSameSizeAs(game.questions());
    }

    @Test
    void aStrategyRejectsGamesOfAnotherType() throws IOException {
        String quiz = resource("/dsl-examples/", GameType.QUIZ);

        assertThatThrownBy(() -> new OrderingGameStrategy(MAPPER).parseToQuestions(quiz))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ORDERING");
    }

    @Test
    void textThatIsNotADslIsRejectedWithAClearMessage() {
        assertThatThrownBy(() -> new QuizGameStrategy(MAPPER).parseToQuestions("không phải json"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Game DSL");
    }

    // ---- entity -> DSL ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void examplesSurviveTheRoundTripThroughEntities(GameType type) throws IOException {
        String raw = resource("/dsl-examples/", type);
        GameContentStrategy<?, ?> strategy = STRATEGIES.get(type);

        GameDsl back = strategy.toGameDsl(gameOf(type, strategy.parseToQuestions(raw)));

        assertSameQuestions(type, MAPPER.readTree(raw).get("questions"), MAPPER.valueToTree(back).get("questions"));
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void gamesBuiltByTheFactoriesSurviveTheRoundTripAndStayValid(GameType type) throws IOException {
        AiGameOutput output = new AiOutputValidator(MAPPER).validate(type, resource("/ai-output-examples/", type)).output();
        GameContentStrategy<?, ?> strategy = STRATEGIES.get(type);

        for (long seed = 0; seed < 100; seed++) {
            GameDsl created = registry(new Random(seed)).create(type, output, REQUEST);
            JsonNode createdJson = MAPPER.valueToTree(created);

            GameDsl back = strategy.toGameDsl(gameOf(type, strategy.parseToQuestions(MAPPER.writeValueAsString(created))));

            assertSameQuestions(type, createdJson.get("questions"), MAPPER.valueToTree(back).get("questions"));
            ValidationReport report = LAYERS_1_AND_2.validate(MAPPER.valueToTree(back));
            assertThat(report.errors()).as("%s, hạt giống %d", type, seed).isEmpty();
        }
    }

    @Test
    void theEnvelopeIsRebuiltFromTheGame() throws IOException {
        Game game = gameOf(GameType.QUIZ, new QuizGameStrategy(MAPPER).parseToQuestions(resource("/dsl-examples/", GameType.QUIZ)));
        game.setGrade(GradeLevel.KINDERGARTEN);

        QuizGameDsl dsl = (QuizGameDsl) new QuizGameStrategy(MAPPER).toGameDsl(game);

        assertThat(dsl.schemaVersion()).isEqualTo("1.0.0");
        assertThat(dsl.metadata().title()).isEqualTo("Tên game");
        assertThat(dsl.metadata().gradeLevel()).isEqualTo(GradeLevel.KINDERGARTEN);
        assertThat(dsl.gameplaySettings().hitboxScale()).isEqualTo(1.5);
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void savedEntitiesWithDatabaseIdsStillGiveAValidDslWithPositionalIds(GameType type) throws IOException {
        GameContentStrategy<?, ?> strategy = STRATEGIES.get(type);
        List<QuestionGame> questions = strategy.parseToQuestions(resource("/dsl-examples/", type));
        for (QuestionGame question : questions) {
            question.setId(UUID.randomUUID().toString());
            if (question instanceof OrderingQuestion ordering) {
                ordering.getSteps().forEach(step -> step.setStepId(UUID.randomUUID().toString()));
            }
        }

        GameDsl dsl = strategy.toGameDsl(gameOf(type, questions));

        assertThat(LAYERS_1_AND_2.validate(MAPPER.valueToTree(dsl)).errors()).isEmpty();
        assertThat(dsl.questions().get(0).id()).isEqualTo("q1");
    }

    @Test
    void orderingIsNeverShownInTheCorrectOrderAndUsesPositionalStepIds() {
        OrderingQuestion question = new OrderingQuestion();
        List<OrderStep> steps = new ArrayList<>();
        for (int position = 1; position <= 4; position++) {
            OrderStep step = new OrderStep();
            step.setStepId("step-" + position);
            step.setText("Bước " + position);
            step.setCorrectPosition(position);
            steps.add(step);
        }
        question.setSteps(steps);

        OrderingQuestionDsl dsl = new OrderingGameStrategy(MAPPER).toQuestionDsls(List.of(question)).get(0);

        assertThat(dsl.steps()).extracting(OrderStepDsl::correctPosition).isNotEqualTo(List.of(1, 2, 3, 4));
        assertThat(dsl.steps()).extracting(OrderStepDsl::correctPosition).containsExactlyInAnyOrder(1, 2, 3, 4);
        assertThat(dsl.steps()).extracting(OrderStepDsl::id).containsExactly("s1", "s2", "s3", "s4");
    }

    @Test
    void aStrategyRejectsQuestionsOfAnotherType() {
        assertThatThrownBy(() -> new QuizGameStrategy(MAPPER).toQuestionDsls(List.of(new OrderingQuestion())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("QuizQuestion");
    }

    @Test
    void aStrategyRejectsAGameOfAnotherType() {
        Game game = gameOf(GameType.ORDERING, List.of());

        assertThatThrownBy(() -> new QuizGameStrategy(MAPPER).toGameDsl(game))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("QUIZ");
    }

    @Test
    void theOrderingGameDslKeepsItsType() {
        OrderingGameDsl dsl = (OrderingGameDsl) new OrderingGameStrategy(MAPPER).toGameDsl(gameOf(GameType.ORDERING, List.of()));

        assertThat(dsl.gameType()).isEqualTo(GameType.ORDERING);
    }
}
