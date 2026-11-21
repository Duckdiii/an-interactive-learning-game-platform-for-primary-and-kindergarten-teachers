package com.aigameplatform.backend.service.validation.cpf;

import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.GameValidationContext;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Điểm vào kiểm duyệt game CPF: chuỗi Chain of Responsibility riêng Layer 1 (schema) → Layer 2 (luật) → Layer 3 (an
 * toàn), không lớp nào bị bỏ qua. Các lớp CPF không là bean Spring để không lọt vào chuỗi DSL của
 * {@code GameValidationService} (vốn nhận mọi {@code AbstractGameValidator}).
 */
@Service
public class CpfValidationService {

    private final AbstractGameValidator chain;
    private final JsonMapper jsonMapper;

    public CpfValidationService(CpfAssetCatalog assets, ContentSafetyCheck safetyCheck, JsonMapper jsonMapper) {
        AbstractGameValidator schema = new CpfSchemaValidator();
        schema.linkWith(new CpfRuleValidator(assets)).linkWith(new CpfSafetyValidator(safetyCheck));
        this.chain = schema;
        this.jsonMapper = jsonMapper;
    }

    public CpfValidationReport validate(String rawJson) {
        JsonNode json;
        try {
            json = rawJson == null || rawJson.isBlank() ? null : jsonMapper.readTree(rawJson);
        } catch (JacksonException e) {
            return new CpfValidationReport(List.of(new ValidationError("$", "Không phải JSON hợp lệ: " + e.getOriginalMessage())), null);
        }
        if (json == null) {
            return new CpfValidationReport(List.of(new ValidationError("$", "Không có nội dung JSON")), null);
        }
        return validate(json);
    }

    public CpfValidationReport validate(JsonNode json) {
        List<ValidationError> errors = chain.validate(new GameValidationContext(json));
        return new CpfValidationReport(errors, errors.isEmpty() ? json : null);
    }
}
