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

/** Nạp sẵn JSON Schema của Game JSON DSL v1.0.0 cho từng loại game. Thiếu file là lỗi ngay khi khởi động. */
@Component
public class GameDslSchemaRegistry {

    public static final String SUPPORTED_VERSION = "1.0.0";
    private static final String SCHEMA_PATH = "/schema/game-dsl/" + SUPPORTED_VERSION + "/";

    private final Map<GameType, Schema> schemas = new EnumMap<>(GameType.class);

    public GameDslSchemaRegistry() {
        // JSON_PATH để vị trí lỗi có dạng $.questions[1].points, nhất quán với các lỗi tự tạo.
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12,
                builder -> builder.schemaRegistryConfig(
                        SchemaRegistryConfig.builder().pathType(PathType.JSON_PATH).build()));
        for (GameType type : GameType.values()) {
            schemas.put(type, load(registry, type));
        }
    }

    public Schema schemaFor(GameType type) {
        return schemas.get(type);
    }

    private static Schema load(SchemaRegistry registry, GameType type) {
        String resource = SCHEMA_PATH + type.name().toLowerCase(Locale.ROOT).replace('_', '-') + ".schema.json";
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
