package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

/**
 * Kiểm tra Spring nối đủ ba lớp kiểm duyệt theo đúng thứ tự (kể cả JsonMapper của Boot) mà không cần DB.
 * Không cấu hình API key nên Layer 3 chỉ dùng danh sách từ cấm và không gọi OpenAI.
 */
@SpringJUnitConfig({GameDslSchemaRegistry.class, SchemaGameValidator.class, BusinessRuleGameValidator.class,
        SafetyGameValidator.class, BlockedWordList.class, OpenAiModerationClient.class, GameValidationService.class,
        QuizRule.class, AudioVisualMatchRule.class, OddOneOutRule.class, WordScrambleRule.class, MatchingRule.class,
        MemoryCardRule.class, DragDropRule.class, OrderingRule.class, VisualClozeRule.class})
@ImportAutoConfiguration(JacksonAutoConfiguration.class)
@TestPropertySource(properties = {
        "app.moderation.required=false",
        "app.moderation.blocked-words-location=classpath:moderation/blocked-words-vi.txt",
        "app.moderation.openai.base-url=https://api.openai.com",
        "app.moderation.openai.api-key=",
        "app.moderation.openai.model=omni-moderation-latest",
        "app.moderation.openai.timeout-seconds=1"
})
class GameValidationWiringTest {

    @Autowired
    private GameValidationService service;

    private static String example(String file) throws IOException {
        try (InputStream in = GameValidationWiringTest.class.getResourceAsStream("/dsl-examples/" + file + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void validatesARealGameThroughTheSpringManagedChain() throws IOException {
        assertThat(service.validate(example("quiz")).valid()).isTrue();
    }

    @Test
    void layer1RunsFirstAndStopsTheChain() {
        ValidationReport report = service.validate("{\"schemaVersion\":\"1.0.0\"}");

        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.gameType");
    }

    @Test
    void layer2RunsAfterLayer1() throws IOException {
        String broken = example("quiz").replaceFirst("\"correctOptionId\": \"b\"", "\"correctOptionId\": \"d\"");

        ValidationReport report = service.validate(broken);

        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.questions[0].correctOptionId");
        assertThat(report.unsafe()).isFalse();
    }

    @Test
    void layer3RunsLastAndMarksTheGameAsUnsafe() throws IOException {
        String unsafe = example("quiz").replace("Có mấy con mèo?", "Địt mẹ con nào?");

        ValidationReport report = service.validate(unsafe);

        assertThat(report.valid()).isFalse();
        assertThat(report.unsafe()).isTrue();
        assertThat(report.game()).isNull();
    }

    @Test
    void anUnsafeWordInABrokenGameIsReportedByTheEarlierLayerOnly() throws IOException {
        String both = example("quiz")
                .replace("Có mấy con mèo?", "Địt mẹ con nào?")
                .replaceFirst("\"correctOptionId\": \"b\"", "\"correctOptionId\": \"d\"");

        ValidationReport report = service.validate(both);

        assertThat(report.unsafe()).isFalse();
        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.questions[0].correctOptionId");
    }
}
