package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.service.factory.GameDefaults;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** `CUSTOM` (game CPF) không có DSL v1.0.0: các chỗ chỉ dành cho DSL phải từ chối rõ ràng thay vì NPE. */
class CustomGameTypeGuardTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Test
    void dslSchemaLayerRejectsCustomAsUnsupported() {
        var validation = new GameValidationService(
                java.util.List.of(new SchemaGameValidator(new GameDslSchemaRegistry(), MAPPER)), MAPPER);

        var report = validation.validate("{\"schemaVersion\":\"1.0.0\",\"gameType\":\"CUSTOM\"}");

        assertThat(report.errors()).singleElement()
                .satisfies(e -> assertThat(e.path()).isEqualTo("$.gameType"));
    }

    @Test
    void aiOutputValidatorRejectsCustom() {
        var report = new AiOutputValidator(MAPPER).validate(GameType.CUSTOM, "{\"questions\":[]}");

        assertThat(report.valid()).isFalse();
    }

    @Test
    void gameDefaultsExplainThatCustomHasNoPerQuestionDefaults() {
        assertThatThrownBy(() -> GameDefaults.points(GameType.CUSTOM)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> GameDefaults.timeLimitSeconds(GameType.CUSTOM, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
