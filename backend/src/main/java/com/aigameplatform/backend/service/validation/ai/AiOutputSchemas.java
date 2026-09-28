package com.aigameplatform.backend.service.validation.ai;

import com.aigameplatform.backend.entity.enums.GameType;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Đọc JSON Schema của "dạng đầu ra của AI" (Game AI Output v1.0.0) từ resources, có nhớ đệm. */
public final class AiOutputSchemas {

    static final String VERSION = "1.0.0";
    private static final String PATH = "/schema/game-ai-output/" + VERSION + "/";
    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Map<GameType, String> RAW = new ConcurrentHashMap<>();
    private static final Map<GameType, String> FOR_LLM = new ConcurrentHashMap<>();

    private AiOutputSchemas() {
    }

    /** Nguyên văn file schema. */
    public static String rawJson(GameType type) {
        return RAW.computeIfAbsent(type, AiOutputSchemas::load);
    }

    /** Schema đưa cho LLM làm Structured Outputs: bỏ {@code $schema} và {@code title} vì LLM không cần. */
    public static String forLlm(GameType type) {
        return FOR_LLM.computeIfAbsent(type, t -> {
            ObjectNode schema = (ObjectNode) MAPPER.readTree(rawJson(t));
            schema.remove("$schema");
            schema.remove("title");
            return MAPPER.writeValueAsString(schema);
        });
    }

    private static String load(GameType type) {
        String resource = PATH + type.name().toLowerCase(Locale.ROOT).replace('_', '-') + ".schema.json";
        try (InputStream in = AiOutputSchemas.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException("Thiếu JSON Schema đầu ra của AI: " + resource);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được JSON Schema: " + resource, e);
        }
    }
}
