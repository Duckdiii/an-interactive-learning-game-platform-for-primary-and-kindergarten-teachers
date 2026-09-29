package com.aigameplatform.backend.service.validation;

import java.util.List;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Điểm vào của bộ kiểm duyệt: nối các lớp theo thứ tự {@code @Order} thành một chuỗi rồi chạy. */
@Service
public class GameValidationService {

    private final AbstractGameValidator chain;
    private final JsonMapper jsonMapper;

    /** @param validators các lớp kiểm duyệt đã sắp theo thứ tự chạy (Layer 1 trước). */
    public GameValidationService(List<AbstractGameValidator> validators, JsonMapper jsonMapper) {
        if (validators.isEmpty()) {
            throw new IllegalStateException("Cần ít nhất một lớp kiểm duyệt game");
        }
        for (int i = 0; i < validators.size() - 1; i++) {
            validators.get(i).linkWith(validators.get(i + 1));
        }
        this.chain = validators.get(0);
        this.jsonMapper = jsonMapper;
    }

    public ValidationReport validate(String rawJson) {
        JsonNode json;
        try {
            json = rawJson == null || rawJson.isBlank() ? null : jsonMapper.readTree(rawJson);
        } catch (JacksonException e) {
            return failed(new ValidationError("$", "Không phải JSON hợp lệ: " + e.getOriginalMessage()));
        }
        if (json == null) {
            return failed(new ValidationError("$", "Không có nội dung JSON"));
        }
        return validate(json);
    }

    public ValidationReport validate(JsonNode json) {
        GameValidationContext context = new GameValidationContext(json);
        List<ValidationError> errors = chain.validate(context);
        return new ValidationReport(errors, errors.isEmpty() ? context.getGame() : null);
    }

    private static ValidationReport failed(ValidationError error) {
        return new ValidationReport(List.of(error), null);
    }
}
