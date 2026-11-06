package com.aigameplatform.backend.service.validation.cpf;

import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.GameValidationContext;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SchemaRegistryConfig;
import com.networknt.schema.SpecificationVersion;
import com.networknt.schema.path.PathType;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import tools.jackson.databind.JsonNode;

/** Layer 1 của CPF: JSON phải khớp JSON Schema CPF Game v2.0.0. */
final class CpfSchemaValidator extends AbstractGameValidator {

    static final String RESOURCE = "/schema/cpf/2.0.0/cpf-game.schema.json";

    private final Schema schema;

    CpfSchemaValidator() {
        // JSON_PATH để vị trí lỗi có dạng $.content.rounds[0], nhất quán với chuỗi DSL và với lỗi Lớp 2.
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12,
                builder -> builder.schemaRegistryConfig(SchemaRegistryConfig.builder().pathType(PathType.JSON_PATH).build()));
        try (InputStream in = CpfSchemaValidator.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("Thiếu JSON Schema: " + RESOURCE);
            this.schema = registry.getSchema(in);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được JSON Schema: " + RESOURCE, e);
        }
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        JsonNode json = context.getJson();
        if (json == null || !json.isObject()) {
            return List.of(new ValidationError("$", "JSON của game phải là một object"));
        }
        return schema.validate(json).stream()
                .map(e -> new ValidationError(e.getInstanceLocation().toString(), e.getMessage()))
                .toList();
    }
}
