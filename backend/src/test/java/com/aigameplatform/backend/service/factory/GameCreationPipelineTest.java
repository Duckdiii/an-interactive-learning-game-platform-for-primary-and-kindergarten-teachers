package com.aigameplatform.backend.service.factory;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.config.RandomConfig;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.validation.BusinessRuleGameValidator;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.SafetyGameValidator;
import com.aigameplatform.backend.service.validation.SchemaGameValidator;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
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
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import tools.jackson.databind.json.JsonMapper;

/**
 * Luồng đầu-cuối không gọi LLM: JSON thô của AI, kiểm tra đầu ra AI, Backend dựng DSL hoàn chỉnh, rồi 3 lớp kiểm
 * duyệt. Toàn bộ bean do Spring nối, không cần DB; chưa có API key nên Layer 3 chỉ dùng danh sách từ cấm.
 */
@SpringJUnitConfig({RandomConfig.class, GameDslFactoryRegistry.class, QuizGameDslFactory.class,
        AudioVisualMatchGameDslFactory.class, OddOneOutGameDslFactory.class, SpotTheTargetGameDslFactory.class,
        WordScrambleGameDslFactory.class, MatchingGameDslFactory.class, MemoryCardGameDslFactory.class,
        DragDropGameDslFactory.class, OrderingGameDslFactory.class, VisualClozeGameDslFactory.class,
        AiOutputValidator.class, GameDslSchemaRegistry.class, SchemaGameValidator.class,
        BusinessRuleGameValidator.class, SafetyGameValidator.class, BlockedWordList.class,
        OpenAiModerationClient.class, GameValidationService.class, QuizRule.class, AudioVisualMatchRule.class,
        OddOneOutRule.class, WordScrambleRule.class, MatchingRule.class, MemoryCardRule.class, DragDropRule.class,
        OrderingRule.class, VisualClozeRule.class})
@ImportAutoConfiguration(JacksonAutoConfiguration.class)
@TestPropertySource(properties = {
        "app.moderation.required=false",
        "app.moderation.blocked-words-location=classpath:moderation/blocked-words-vi.txt",
        "app.moderation.openai.base-url=https://api.openai.com",
        "app.moderation.openai.api-key=",
        "app.moderation.openai.model=omni-moderation-latest",
        "app.moderation.openai.timeout-seconds=1"
})
class GameCreationPipelineTest {

    private static final GameDslRequest REQUEST = new GameDslRequest("Chủ đề mẫu", Subject.MATH, GradeLevel.GRADE_3);

    @Autowired
    private AiOutputValidator aiOutputValidator;

    @Autowired
    private GameDslFactoryRegistry registry;

    @Autowired
    private GameValidationService validationService;

    @Autowired
    private JsonMapper mapper;

    private static String rawAiOutput(GameType type) throws IOException {
        String file = type.name().toLowerCase().replace('_', '-');
        try (InputStream in = GameCreationPipelineTest.class.getResourceAsStream("/ai-output-examples/" + file + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private ValidationReport run(GameType type, String rawAiJson) {
        AiOutputReport aiReport = aiOutputValidator.validate(type, rawAiJson);
        assertThat(aiReport.errors()).isEmpty();
        GameDsl game = registry.create(type, aiReport.output(), REQUEST);
        return validationService.validate(mapper.valueToTree(game));
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void rawAiJsonBecomesAGameThatPassesAllThreeLayers(GameType type) throws IOException {
        ValidationReport report = run(type, rawAiOutput(type));

        assertThat(report.errors()).isEmpty();
        assertThat(report.game().gameType()).isEqualTo(type);
        assertThat(report.game().metadata().gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
    }

    @Test
    void unsafeTextWrittenByTheAiIsCaughtByLayer3AfterTheGameIsBuilt() throws IOException {
        String unsafe = rawAiOutput(GameType.QUIZ).replace("Có mấy con mèo?", "Địt mẹ con nào?");

        ValidationReport report = run(GameType.QUIZ, unsafe);

        assertThat(report.unsafe()).isTrue();
        assertThat(report.game()).isNull();
    }
}
