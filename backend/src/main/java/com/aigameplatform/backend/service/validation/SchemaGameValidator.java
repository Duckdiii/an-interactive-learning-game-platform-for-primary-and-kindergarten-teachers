package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import java.util.List;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Layer 1 (cú pháp): JSON phải khớp 100% JSON Schema của đúng loại game và đúng phiên bản DSL. */
@Component
@Order(1)
public class SchemaGameValidator extends AbstractGameValidator {

    private static final String ROOT = "$";

    private final GameDslSchemaRegistry schemaRegistry;
    private final JsonMapper jsonMapper;

    public SchemaGameValidator(GameDslSchemaRegistry schemaRegistry, JsonMapper jsonMapper) {
        this.schemaRegistry = schemaRegistry;
        this.jsonMapper = jsonMapper;
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        JsonNode json = context.getJson();
        if (json == null || !json.isObject()) {
            return List.of(new ValidationError(ROOT, "JSON của game phải là một object"));
        }

        JsonNode version = json.get("schemaVersion");
        if (version == null || !version.isString() || !GameDslSchemaRegistry.SUPPORTED_VERSION.equals(version.asString())) {
            return List.of(new ValidationError("$.schemaVersion",
                    "schemaVersion phải là \"" + GameDslSchemaRegistry.SUPPORTED_VERSION + "\""));
        }

        GameType type = gameTypeOf(json);
        if (type == null) {
            return List.of(new ValidationError("$.gameType", "gameType thiếu hoặc không thuộc các loại game được hỗ trợ"));
        }

        Schema schema = schemaRegistry.schemaFor(type);
        List<Error> schemaErrors = schema.validate(json);
        if (!schemaErrors.isEmpty()) {
            return schemaErrors.stream()
                    .map(e -> new ValidationError(e.getInstanceLocation().toString(), e.getMessage()))
                    .toList();
        }

        try {
            context.setGame(jsonMapper.treeToValue(json, GameDsl.class));
        } catch (JacksonException e) {
            return List.of(new ValidationError(ROOT, "Không đọc được JSON thành game: " + e.getOriginalMessage()));
        }
        return List.of();
    }

    private static GameType gameTypeOf(JsonNode json) {
        JsonNode node = json.get("gameType");
        if (node == null || !node.isString()) {
            return null;
        }
        try {
            return GameType.valueOf(node.asString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
