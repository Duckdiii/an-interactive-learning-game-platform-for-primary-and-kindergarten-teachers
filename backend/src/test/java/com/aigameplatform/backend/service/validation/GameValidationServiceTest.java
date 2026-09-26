package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.MatchingGameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GameValidationServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameDslSchemaRegistry REGISTRY = new GameDslSchemaRegistry();

    private static String exampleText(GameType type) throws IOException {
        String file = type.name().toLowerCase().replace('_', '-');
        try (InputStream in = GameValidationServiceTest.class.getResourceAsStream("/dsl-examples/" + file + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private GameValidationService serviceWithLayer1() {
        return new GameValidationService(List.of(new SchemaGameValidator(REGISTRY, MAPPER)), MAPPER);
    }

    @Test
    void validJsonYieldsAValidReportWithTheTypedGame() throws IOException {
        ValidationReport report = serviceWithLayer1().validate(exampleText(GameType.MATCHING));

        assertThat(report.valid()).isTrue();
        assertThat(report.errors()).isEmpty();
        assertThat(report.game()).isInstanceOf(MatchingGameDsl.class);
    }

    @Test
    void schemaViolationYieldsErrorsAndNoGame() throws IOException {
        String broken = exampleText(GameType.QUIZ).replace("\"schemaVersion\": \"1.0.0\"", "\"schemaVersion\": \"0.9\"");

        ValidationReport report = serviceWithLayer1().validate(broken);

        assertThat(report.valid()).isFalse();
        assertThat(report.game()).isNull();
        assertThat(report.errors()).extracting(ValidationError::path).containsExactly("$.schemaVersion");
    }

    @Test
    void malformedJsonIsReportedInsteadOfThrowing() {
        ValidationReport report = serviceWithLayer1().validate("{ \"gameType\": \"QUIZ\", ");

        assertThat(report.valid()).isFalse();
        assertThat(report.errors()).hasSize(1);
        assertThat(report.errors().get(0).message()).startsWith("Không phải JSON hợp lệ");
    }

    @Test
    void jsonWrappedInMarkdownFencesIsRejected() {
        ValidationReport report = serviceWithLayer1().validate("```json\n{\"gameType\":\"QUIZ\"}\n```");

        assertThat(report.valid()).isFalse();
        assertThat(report.game()).isNull();
    }

    @Test
    void blankAndNullInputAreReported() {
        GameValidationService service = serviceWithLayer1();

        assertThat(service.validate((String) null).valid()).isFalse();
        assertThat(service.validate("   ").valid()).isFalse();
    }

    @Test
    void laterLayersOnlyRunAfterEarlierOnesPass() throws IOException {
        List<String> calls = new ArrayList<>();
        AbstractGameValidator layer2 = new AbstractGameValidator() {
            @Override
            protected List<ValidationError> check(GameValidationContext context) {
                calls.add("layer2 sees " + context.getGame().gameType());
                return List.of();
            }
        };
        GameValidationService service = new GameValidationService(
                List.of(new SchemaGameValidator(REGISTRY, MAPPER), layer2), MAPPER);

        service.validate("{}");
        assertThat(calls).isEmpty();

        service.validate(exampleText(GameType.QUIZ));
        assertThat(calls).containsExactly("layer2 sees QUIZ");
    }

    @Test
    void requiresAtLeastOneValidator() {
        assertThatThrownBy(() -> new GameValidationService(List.of(), MAPPER))
                .isInstanceOf(IllegalStateException.class);
    }
}
