package com.aigameplatform.backend.service.testsupport;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.factory.AudioVisualMatchGameDslFactory;
import com.aigameplatform.backend.service.factory.DragDropGameDslFactory;
import com.aigameplatform.backend.service.factory.GameDslFactoryRegistry;
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
import com.aigameplatform.backend.service.validation.SchemaGameValidator;
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
import java.util.List;
import java.util.Locale;
import java.util.random.RandomGenerator;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cách dựng lại các thành phần dùng chung (bộ 10 factory, bộ 10 strategy, chuỗi kiểm duyệt Layer 1+2) trong test,
 * để không phải lặp lại y hệt ở nhiều file test (trước đây: {@code GameDslFactoryTest}, {@code
 * GameGenerationServiceTest}, {@code GameContentStrategyMappingTest} mỗi file tự dựng lại một bản). Thêm loại
 * game mới thì chỉ cần sửa ở đây, không phải sửa từng file test.
 */
public final class GameTestFixtures {

    private GameTestFixtures() {
    }

    /** JSON của một ví dụ theo loại game, đọc từ tài nguyên test ({@code /ai-output-examples/} hay {@code /dsl-examples/}). */
    public static String resource(String folder, GameType type) throws IOException {
        String file = type.name().toLowerCase(Locale.ROOT).replace('_', '-');
        try (InputStream in = GameTestFixtures.class.getResourceAsStream(folder + file + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /** Luật Layer 2 của cả 10 loại game (SPOT_THE_TARGET không có luật riêng, xem {@code AbstractGameRule}). */
    public static List<AbstractGameRule<?, ?>> rules() {
        return List.of(new QuizRule(), new AudioVisualMatchRule(), new OddOneOutRule(), new WordScrambleRule(),
                new MatchingRule(), new MemoryCardRule(), new DragDropRule(), new OrderingRule(), new VisualClozeRule());
    }

    /** Layer 1 (JSON Schema) và Layer 2 (luật nghiệp vụ), theo đúng thứ tự chạy. Dùng khi test không cần Layer 3
     *  (an toàn), hoặc muốn tự nối thêm Layer 3 với cấu hình kiểm duyệt riêng của mình. */
    public static List<AbstractGameValidator> schemaAndBusinessRuleValidators(JsonMapper mapper) {
        return List.of(new SchemaGameValidator(new GameDslSchemaRegistry(), mapper),
                new BusinessRuleGameValidator(rules()));
    }

    /** Chỉ Layer 1 và Layer 2, đã đóng gói sẵn thành {@link GameValidationService}. */
    public static GameValidationService schemaAndBusinessRuleValidation(JsonMapper mapper) {
        return new GameValidationService(schemaAndBusinessRuleValidators(mapper), mapper);
    }

    /** Factory Method của cả 10 loại game, dùng chung một nguồn ngẫu nhiên để xáo trộn lặp lại được khi test. */
    public static GameDslFactoryRegistry factoryRegistry(RandomGenerator random) {
        return new GameDslFactoryRegistry(List.of(
                new QuizGameDslFactory(random), new AudioVisualMatchGameDslFactory(random),
                new OddOneOutGameDslFactory(random), new SpotTheTargetGameDslFactory(random),
                new WordScrambleGameDslFactory(random), new MatchingGameDslFactory(random),
                new MemoryCardGameDslFactory(random), new DragDropGameDslFactory(random),
                new OrderingGameDslFactory(random), new VisualClozeGameDslFactory(random)));
    }

    /** Strategy của cả 10 loại game. */
    public static List<GameContentStrategy<?, ?>> strategies(JsonMapper mapper) {
        return List.<GameContentStrategy<?, ?>>of(
                new QuizGameStrategy(mapper), new AudioVisualMatchGameStrategy(mapper),
                new OddOneOutGameStrategy(mapper), new SpotTheTargetGameStrategy(mapper),
                new WordScrambleGameStrategy(mapper), new MatchingGameStrategy(mapper),
                new MemoryCardGameStrategy(mapper), new DragDropGameStrategy(mapper),
                new OrderingGameStrategy(mapper), new VisualClozeGameStrategy(mapper));
    }
}
