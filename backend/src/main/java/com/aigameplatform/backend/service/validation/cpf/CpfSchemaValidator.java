package com.aigameplatform.backend.service.validation.cpf;

import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.GameValidationContext;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.networknt.schema.Error;
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
        return withoutOtherBranches(schema.validate(json)).stream()
                .map(e -> new ValidationError(e.getInstanceLocation().toString(), e.getMessage()))
                .distinct()
                .toList();
    }

    /**
     * Sự kiện và hành động là {@code oneOf} theo {@code type}: khi sai, thư viện báo lỗi của MỌI nhánh (thiếu target, thiếu
     * a, b...), làm lỗi thật bị đẩy khỏi số lỗi gửi lại AI. Bỏ lỗi của nhánh có {@code type} không khớp, và bỏ câu chung
     * "chỉ một nhánh hợp lệ" khi đã còn lỗi cụ thể ở cùng chỗ.
     */
    static List<Error> withoutOtherBranches(List<Error> errors) {
        List<String> wrongBranches = errors.stream()
                .map(e -> slashPath(e.getEvaluationPath()))
                .filter(path -> path.endsWith("/properties/type/const") || path.endsWith("/properties/type/enum"))
                .map(path -> path.substring(0, path.lastIndexOf("/properties/type/")))
                .filter(branch -> branch.matches(".*/oneOf/\\d+$"))
                .toList();
        List<Error> kept = errors.stream()
                .filter(e -> wrongBranches.stream().noneMatch(branch -> isWithin(slashPath(e.getEvaluationPath()), branch)))
                .toList();
        return kept.stream()
                .filter(e -> !"oneOf".equals(e.getKeyword()) || kept.stream().noneMatch(other ->
                        !"oneOf".equals(other.getKeyword())
                                && isWithin(slashPath(other.getInstanceLocation()), slashPath(e.getInstanceLocation()))))
                .toList();
    }

    /** Đường dẫn dạng /a/0/b dựng từ từng phần tử, không phụ thuộc kiểu in của thư viện (JSON_PATH hay JSON_POINTER). */
    private static String slashPath(com.networknt.schema.path.NodePath path) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < path.getNameCount(); i++) out.append('/').append(path.getElement(i));
        return out.toString();
    }

    /** {@code path} là {@code base} hoặc nằm bên trong nó (/a/b nằm trong /a; /a1 thì không). */
    private static boolean isWithin(String path, String base) {
        return path.equals(base) || path.startsWith(base + "/");
    }
}
