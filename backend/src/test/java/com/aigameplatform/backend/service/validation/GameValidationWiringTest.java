package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

/** Kiểm tra Spring nối đủ các bean kiểm duyệt (kể cả JsonMapper của Boot) mà không cần DB. */
@SpringJUnitConfig({GameDslSchemaRegistry.class, SchemaGameValidator.class, GameValidationService.class})
@ImportAutoConfiguration(JacksonAutoConfiguration.class)
class GameValidationWiringTest {

    @Autowired
    private GameValidationService service;

    @Test
    void validatesARealGameThroughTheSpringManagedChain() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/dsl-examples/quiz.json")) {
            String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);

            assertThat(service.validate(json).valid()).isTrue();
        }
    }

    @Test
    void rejectsBrokenJsonThroughTheSpringManagedChain() {
        assertThat(service.validate("{\"schemaVersion\":\"1.0.0\"}").valid()).isFalse();
    }
}
