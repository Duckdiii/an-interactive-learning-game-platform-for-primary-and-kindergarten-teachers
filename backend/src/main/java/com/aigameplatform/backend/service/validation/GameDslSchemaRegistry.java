package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.entity.enums.GameType;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SchemaRegistryConfig;
import com.networknt.schema.SpecificationVersion;
import com.networknt.schema.path.PathType;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Nạp sẵn schema cho từng cặp phiên bản DSL và loại game. Thiếu schema là lỗi ngay khi khởi động. */
@Component
public class GameDslSchemaRegistry {

    public static final String SUPPORTED_VERSION = "1.0.0";
    public static final String VISUAL_CLOZE_IMAGE_VERSION = "1.1.0";

    private final Map<GameType, Schema> schemas = new EnumMap<>(GameType.class);
    private final Map<String, Map<GameType, Schema>> versionedSchemas = new java.util.HashMap<>();

    public GameDslSchemaRegistry() {
        // JSON_PATH để vị trí lỗi có dạng $.questions[1].points, nhất quán với các lỗi tự tạo.
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12,
                builder -> builder.schemaRegistryConfig(
                        SchemaRegistryConfig.builder().pathType(PathType.JSON_PATH).build()));
        Map<GameType, Schema> v1Schemas = new EnumMap<>(GameType.class);
        for (GameType type : GameType.values()) {
            v1Schemas.put(type, load(registry, SUPPORTED_VERSION, type));
        }
        schemas.putAll(v1Schemas);
        versionedSchemas.put(SUPPORTED_VERSION, v1Schemas);
        Map<GameType, Schema> v1_1Schemas = new EnumMap<>(GameType.class);
        v1_1Schemas.put(GameType.VISUAL_CLOZE, load(registry, VISUAL_CLOZE_IMAGE_VERSION, GameType.VISUAL_CLOZE));
        v1_1Schemas.put(GameType.ODD_ONE_OUT, load(registry, VISUAL_CLOZE_IMAGE_VERSION, GameType.ODD_ONE_OUT));
        versionedSchemas.put(VISUAL_CLOZE_IMAGE_VERSION, v1_1Schemas);
    }

    public Schema schemaFor(GameType type) {
        return schemas.get(type);
    }

    public Schema schemaFor(String version, GameType type) {
        Map<GameType, Schema> byType = versionedSchemas.get(version);
        return byType == null ? null : byType.get(type);
    }

    private static Schema load(SchemaRegistry registry, String version, GameType type) {
        String resource = "/schema/game-dsl/" + version + "/"
                + type.name().toLowerCase(Locale.ROOT).replace('_', '-') + ".schema.json";
        try (InputStream in = GameDslSchemaRegistry.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException("Thiếu JSON Schema: " + resource);
            }
            return registry.getSchema(in);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được JSON Schema: " + resource, e);
        }
    }
}
