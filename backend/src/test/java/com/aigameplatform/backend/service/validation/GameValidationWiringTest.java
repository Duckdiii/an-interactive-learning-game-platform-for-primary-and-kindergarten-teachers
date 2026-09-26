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
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

/** Kiểm tra Spring nối đủ các bean kiểm duyệt (kể cả JsonMapper của Boot) mà không cần DB. */
@SpringJUnitConfig({GameDslSchemaRegistry.class, SchemaGameValidator.class, BusinessRuleGameValidator.class,
        GameValidationService.class, QuizRule.class, AudioVisualMatchRule.class, OddOneOutRule.class,
        WordScrambleRule.class, MatchingRule.class, MemoryCardRule.class, DragDropRule.class, OrderingRule.class,
        VisualClozeRule.class})
@ImportAutoConfiguration(JacksonAutoConfiguration.class)
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
    void layer2RunsAfterLayer1ThroughTheSpringManagedChain() throws IOException {
        String broken = example("quiz").replaceFirst("\"correctOptionId\": \"b\"", "\"correctOptionId\": \"d\"");

        ValidationReport report = service.validate(broken);

        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.questions[0].correctOptionId");
    }
}
