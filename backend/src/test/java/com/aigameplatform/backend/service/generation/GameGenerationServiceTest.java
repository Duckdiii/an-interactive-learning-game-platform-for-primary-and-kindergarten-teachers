package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.factory.AudioVisualMatchGameDslFactory;
import com.aigameplatform.backend.service.factory.DragDropGameDslFactory;
import com.aigameplatform.backend.service.factory.GameDslFactoryRegistry;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.factory.MatchingGameDslFactory;
import com.aigameplatform.backend.service.factory.MemoryCardGameDslFactory;
import com.aigameplatform.backend.service.factory.OddOneOutGameDslFactory;
import com.aigameplatform.backend.service.factory.OrderingGameDslFactory;
import com.aigameplatform.backend.service.factory.QuizGameDslFactory;
import com.aigameplatform.backend.service.factory.SpotTheTargetGameDslFactory;
import com.aigameplatform.backend.service.factory.VisualClozeGameDslFactory;
import com.aigameplatform.backend.service.factory.WordScrambleGameDslFactory;
import com.aigameplatform.backend.service.strategy.AudioVisualMatchGameStrategy;
import com.aigameplatform.backend.service.strategy.DragDropGameStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.MatchingGameStrategy;
import com.aigameplatform.backend.service.strategy.MemoryCardGameStrategy;
import com.aigameplatform.backend.service.strategy.OddOneOutGameStrategy;
import com.aigameplatform.backend.service.strategy.OrderingGameStrategy;
import com.aigameplatform.backend.service.strategy.QuizGameStrategy;
import com.aigameplatform.backend.service.strategy.SpotTheTargetGameStrategy;
import com.aigameplatform.backend.service.strategy.VisualClozeGameStrategy;
import com.aigameplatform.backend.service.strategy.WordScrambleGameStrategy;
import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.BusinessRuleGameValidator;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.SafetyGameValidator;
import com.aigameplatform.backend.service.validation.SchemaGameValidator;
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
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Queue;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

/** Bộ điều phối sinh game với cổng AI và kiểm duyệt giả: không gọi dịch vụ ngoài, không cần DB. */
class GameGenerationServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslRequest REQUEST = new GameDslRequest("Đếm con vật", Subject.MATH, GradeLevel.GRADE_1);

    /** Trả lần lượt các kết quả đã định sẵn (chuỗi JSON hoặc lỗi) và ghi lại các yêu cầu nhận được. */
    private static final class ScriptedGenerator implements GameContentGenerator {

        private final Queue<Object> script = new LinkedList<>();
        final List<GenerationAttempt> attempts = new ArrayList<>();

        ScriptedGenerator(Object... results) {
            Collections.addAll(script, results);
        }

        @Override
        public String generate(GenerationAttempt attempt) {
            attempts.add(attempt);
            Object next = script.remove();
            if (next instanceof RuntimeException e) {
                throw e;
            }
            return (String) next;
        }
    }

    /** Kiểm duyệt giả: chưa cấu hình, hoặc ném lỗi không dùng được, hoặc không gắn cờ gì. */
    private static ContentModerationClient moderation(boolean configured, boolean unavailable) {
        return new ContentModerationClient() {
            @Override
            public boolean isConfigured() {
                return configured;
            }

            @Override
            public List<ModerationResult> moderate(List<String> texts) {
                if (unavailable) {
                    throw new ModerationUnavailableException("giả lập lỗi");
                }
                return texts.stream().map(t -> new ModerationResult(false, List.of())).toList();
            }
        };
    }

    private static GameGenerationService service(GameContentGenerator generator, int maxRetries,
            ContentModerationClient moderation) {
        DefaultListableBeanFactory beans = new DefaultListableBeanFactory();
        if (generator != null) {
            beans.registerSingleton("generator", generator);
        }
        GameValidationService validation = new GameValidationService(List.<AbstractGameValidator>of(
                new SchemaGameValidator(new GameDslSchemaRegistry(), MAPPER),
                new BusinessRuleGameValidator(List.<AbstractGameRule<?, ?>>of(new QuizRule(),
                        new AudioVisualMatchRule(), new OddOneOutRule(), new WordScrambleRule(), new MatchingRule(),
                        new MemoryCardRule(), new DragDropRule(), new OrderingRule(), new VisualClozeRule())),
                new SafetyGameValidator(new BlockedWordList(new ClassPathResource("moderation/blocked-words-vi.txt")),
                        moderation, false)), MAPPER);
        Random random = new Random(7);
        return new GameGenerationService(beans.getBeanProvider(GameContentGenerator.class),
                new GameContentStrategyRegistry(List.<GameContentStrategy<?, ?>>of(
                        new QuizGameStrategy(MAPPER), new AudioVisualMatchGameStrategy(MAPPER), new OddOneOutGameStrategy(MAPPER),
                        new SpotTheTargetGameStrategy(MAPPER), new WordScrambleGameStrategy(MAPPER), new MatchingGameStrategy(MAPPER),
                        new MemoryCardGameStrategy(MAPPER), new DragDropGameStrategy(MAPPER), new OrderingGameStrategy(MAPPER),
                        new VisualClozeGameStrategy(MAPPER))),
                new AiOutputValidator(MAPPER),
                new GameDslFactoryRegistry(List.of(
                        new QuizGameDslFactory(random), new AudioVisualMatchGameDslFactory(random),
                        new OddOneOutGameDslFactory(random), new SpotTheTargetGameDslFactory(random),
                        new WordScrambleGameDslFactory(random), new MatchingGameDslFactory(random),
                        new MemoryCardGameDslFactory(random), new DragDropGameDslFactory(random),
                        new OrderingGameDslFactory(random), new VisualClozeGameDslFactory(random))),
                validation, MAPPER, maxRetries);
    }

    private static GameGenerationService service(GameContentGenerator generator, int maxRetries) {
        return service(generator, maxRetries, moderation(false, false));
    }

    private static String validOutput(GameType type) throws IOException {
        String file = type.name().toLowerCase(Locale.ROOT).replace('_', '-');
        try (InputStream in = GameGenerationServiceTest.class.getResourceAsStream("/ai-output-examples/" + file + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    // ---- thành công ----

    @ParameterizedTest
    @EnumSource(GameType.class)
    void aValidAnswerOnTheFirstTryBecomesAFullGame(GameType type) throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(type));

        GameDsl game = service(generator, 2).generate(type, REQUEST);

        assertThat(game.gameType()).isEqualTo(type);
        assertThat(game.metadata().gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void theFirstRequestCarriesTheTeacherInputAndTheSchemaButNoFeedback() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ));

        service(generator, 2).generate(GameType.QUIZ, REQUEST);

        GenerationAttempt first = generator.attempts.get(0);
        assertThat(first.attemptNumber()).isEqualTo(1);
        assertThat(first.isRetry()).isFalse();
        assertThat(first.topic()).isEqualTo("Đếm con vật");
        assertThat(first.subject()).isEqualTo(Subject.MATH);
        assertThat(first.gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
        assertThat(first.structuredSchema()).isEqualTo(new QuizGameStrategy(MAPPER).getStructuredSchema());
        assertThat(first.previousOutput()).isNull();
        assertThat(first.previousErrors()).isEmpty();
    }

    // ---- thử lại có phản hồi lỗi ----

    @Test
    void aWrongAnswerIsSentBackWithItsErrorsAndTheNextTryCanSucceed() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator("{\"questions\":[]}", validOutput(GameType.QUIZ));

        GameDsl game = service(generator, 2).generate(GameType.QUIZ, REQUEST);

        assertThat(game.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(generator.attempts).hasSize(2);
        GenerationAttempt second = generator.attempts.get(1);
        assertThat(second.attemptNumber()).isEqualTo(2);
        assertThat(second.isRetry()).isTrue();
        assertThat(second.previousOutput()).isEqualTo("{\"questions\":[]}");
        assertThat(second.previousErrors()).isNotEmpty();
    }

    @Test
    void textThatIsNotJsonIsAlsoRetried() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator("xin lỗi, tôi không làm được", validOutput(GameType.QUIZ));

        service(generator, 2).generate(GameType.QUIZ, REQUEST);

        assertThat(generator.attempts).hasSize(2);
        assertThat(generator.attempts.get(1).previousErrors()).extracting(e -> e.message())
                .anyMatch(message -> message.contains("JSON"));
    }

    @Test
    void givesUpAfterTheFirstTryPlusTwoRetries() {
        ScriptedGenerator generator = new ScriptedGenerator("{}", "{}", "{}");

        assertThatThrownBy(() -> service(generator, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasMessageContaining("3 lần");
        assertThat(generator.attempts).hasSize(3);
    }

    @Test
    void withZeroRetriesThereIsOnlyOneTry() {
        ScriptedGenerator generator = new ScriptedGenerator("{}");

        assertThatThrownBy(() -> service(generator, 0).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void onlyTheFirstTenErrorsAreSentBack() throws IOException {
        String manyErrors = "{\"questions\":[" + String.join(",", Collections.nCopies(15, "{}")) + "]}";
        ScriptedGenerator generator = new ScriptedGenerator(manyErrors, validOutput(GameType.QUIZ));

        service(generator, 2).generate(GameType.QUIZ, REQUEST);

        assertThat(generator.attempts.get(1).previousErrors()).hasSize(10);
    }

    // ---- không an toàn và dịch vụ không dùng được: không thử lại ----

    @Test
    void unsafeContentIsRejectedAtOnceWithoutAskingTheAiAgain() throws IOException {
        String unsafe = validOutput(GameType.QUIZ).replace("Có mấy con mèo?", "Địt mẹ con nào?");
        ScriptedGenerator generator = new ScriptedGenerator(unsafe, validOutput(GameType.QUIZ));

        assertThatThrownBy(() -> service(generator, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(UnsafeContentException.class);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void whenModerationCannotBeCheckedTheResultIsATimeoutWithoutRetrying() throws IOException {
        ScriptedGenerator generator = new ScriptedGenerator(validOutput(GameType.QUIZ), validOutput(GameType.QUIZ));

        assertThatThrownBy(() -> service(generator, 2, moderation(true, true)).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasMessageContaining("an toàn");
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void aFailingAiServiceIsATimeoutAndKeepsTheCause() {
        AiServiceUnavailableException failure = new AiServiceUnavailableException("hết quota");
        ScriptedGenerator generator = new ScriptedGenerator(failure);

        assertThatThrownBy(() -> service(generator, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasCause(failure);
        assertThat(generator.attempts).hasSize(1);
    }

    @Test
    void aMissingAiImplementationFailsClearlyInsteadOfAtStartup() {
        assertThatThrownBy(() -> service(null, 2).generate(GameType.QUIZ, REQUEST))
                .isInstanceOf(AiGenerationTimeoutException.class).hasMessageContaining("Chưa cấu hình");
    }

    @Test
    void aNegativeRetryCountIsRejected() {
        assertThatThrownBy(() -> service(new ScriptedGenerator(), -1)).isInstanceOf(IllegalArgumentException.class);
    }
}
