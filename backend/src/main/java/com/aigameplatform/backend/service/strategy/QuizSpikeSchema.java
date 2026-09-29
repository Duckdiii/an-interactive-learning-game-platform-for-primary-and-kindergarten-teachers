package com.aigameplatform.backend.service.strategy;

import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;

final class QuizSpikeSchema {

    private static final String RAW_SCHEMA = """
            {
              "type": "object",
              "properties": {
                "questions": {
                  "type": "array",
                  "minItems": 4,
                  "maxItems": 4,
                  "items": {
                    "type": "object",
                    "properties": {
                      "text": {"type": "string", "minLength": 1},
                      "options": {
                        "type": "array",
                        "minItems": 4,
                        "maxItems": 4,
                        "items": {"type": "string", "minLength": 1}
                      },
                      "correctIndex": {"type": "integer", "minimum": 0, "maximum": 3}
                    },
                    "required": ["text", "options", "correctIndex"],
                    "additionalProperties": false
                  }
                }
              },
              "required": ["questions"],
              "additionalProperties": false
            }
            """;

    private QuizSpikeSchema() {
    }

    static ResponseFormat responseFormat() {
        return ResponseFormat.builder()
                .type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder()
                        .rootElement(JsonRawSchema.builder().schema(RAW_SCHEMA).build())
                        .build())
                .build();
    }
}
