package com.aigameplatform.backend.service.strategy;

import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

final class QuizSpikeSchema {

    static final String VERSION = "game-ai-output-1.0.0+quiz-spike-4x4";
    private static final String RESOURCE = "/schema/game-ai-output/1.0.0/quiz.schema.json";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private QuizSpikeSchema() {
    }

    static Definition definition() {
        try (InputStream input = QuizSpikeSchema.class.getResourceAsStream(RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Missing AI output schema resource: " + RESOURCE);
            }
            ObjectNode schema = (ObjectNode) MAPPER.readTree(input);
            schema.remove("$schema");
            schema.remove("title");
            ObjectNode questions = (ObjectNode) schema.path("properties").path("questions");
            questions.put("minItems", 4);
            questions.put("maxItems", 4);
            ObjectNode options = (ObjectNode) questions.path("items").path("properties").path("options");
            options.put("minItems", 4);
            options.put("maxItems", 4);
            String rawSchema = MAPPER.writeValueAsString(schema);
            return new Definition(rawSchema, sha256(rawSchema));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load the QUIZ AI output schema", exception);
        }
    }

    static ChatRequestParameters requestParameters() {
        Definition definition = definition();
        ResponseFormat format = ResponseFormat.builder()
                .type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder()
                        .rootElement(JsonRawSchema.builder().schema(definition.rawSchema()).build())
                        .build())
                .build();
        return ChatRequestParameters.builder().responseFormat(format).build();
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    record Definition(String rawSchema, String sha256) {
    }
}
