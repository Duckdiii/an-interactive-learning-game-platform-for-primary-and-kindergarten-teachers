package com.aigameplatform.backend.service.validation.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GameType;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class AiOutputSchemasTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    /** Từ khóa đơn giản mà Structured Outputs của LLM chấp nhận (spike Gemini của Quiz cũng chỉ dùng các từ khóa này). */
    private static final Set<String> LLM_SAFE_KEYWORDS = Set.of(
            "type", "properties", "required", "items", "additionalProperties",
            "minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum");

    private static void collectKeywords(JsonNode schema, Set<String> keywords) {
        if (schema.isObject()) {
            schema.properties().forEach(entry -> {
                // Bên trong "properties" khóa là tên trường, không phải từ khóa của schema.
                if (entry.getKey().equals("properties")) {
                    entry.getValue().properties().forEach(field -> collectKeywords(field.getValue(), keywords));
                } else {
                    keywords.add(entry.getKey());
                    collectKeywords(entry.getValue(), keywords);
                }
            });
        } else if (schema.isArray()) {
            schema.forEach(child -> collectKeywords(child, keywords));
        }
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void llmSchemaUsesOnlyKeywordsAnLlmAccepts(GameType type) {
        JsonNode schema = MAPPER.readTree(AiOutputSchemas.forLlm(type));
        Set<String> keywords = new HashSet<>();
        collectKeywords(schema, keywords);

        assertThat(keywords).isSubsetOf(LLM_SAFE_KEYWORDS);
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void llmSchemaDropsTheSchemaAndTitleMetadata(GameType type) {
        JsonNode raw = MAPPER.readTree(AiOutputSchemas.rawJson(type));
        JsonNode forLlm = MAPPER.readTree(AiOutputSchemas.forLlm(type));

        assertThat(raw.has("$schema")).isTrue();
        assertThat(raw.get("title").asString()).contains(type.name());
        assertThat(forLlm.has("$schema")).isFalse();
        assertThat(forLlm.has("title")).isFalse();
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void everySchemaDescribesAnObjectWithARequiredQuestionsArray(GameType type) {
        JsonNode schema = MAPPER.readTree(AiOutputSchemas.forLlm(type));

        assertThat(schema.get("type").asString()).isEqualTo("object");
        assertThat(schema.get("required")).hasSize(1);
        assertThat(schema.get("required").get(0).asString()).isEqualTo("questions");
        assertThat(schema.get("properties").get("questions").get("type").asString()).isEqualTo("array");
        assertThat(schema.get("additionalProperties").asBoolean()).isFalse();
    }

    @ParameterizedTest
    @EnumSource(GameType.class)
    void schemasAreCachedAndSharedBetweenCalls(GameType type) {
        assertThat(AiOutputSchemas.rawJson(type)).isSameAs(AiOutputSchemas.rawJson(type));
        assertThat(AiOutputSchemas.forLlm(type)).isSameAs(AiOutputSchemas.forLlm(type));
    }
}
