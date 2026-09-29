package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.rule.AbstractGameRule;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Layer 2 (logic game): kiểm tra các luật cứng mà JSON Schema không diễn tả được, ví dụ đáp án đúng phải
 * thuộc danh sách lựa chọn. Luật của từng loại game nằm ở {@link AbstractGameRule}; loại nào chưa có luật riêng
 * thì chỉ chịu các kiểm tra chung.
 */
@Component
@Order(2)
public class BusinessRuleGameValidator extends AbstractGameValidator {

    private final Map<GameType, AbstractGameRule<?, ?>> rules = new EnumMap<>(GameType.class);

    public BusinessRuleGameValidator(List<AbstractGameRule<?, ?>> gameRules) {
        for (AbstractGameRule<?, ?> rule : gameRules) {
            if (rules.put(rule.supportedType(), rule) != null) {
                throw new IllegalStateException("Có hơn một luật cho loại game " + rule.supportedType());
            }
        }
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        List<ValidationError> errors = new ArrayList<>();
        collectBlankTexts(context.getJson(), "$", errors);

        GameDsl game = context.getGame();
        AbstractGameRule<?, ?> rule = rules.get(game.gameType());
        if (rule != null) {
            errors.addAll(rule.check(game));
        }
        return errors;
    }

    /** Không chuỗi nào được rỗng hoặc chỉ gồm khoảng trắng. */
    private static void collectBlankTexts(JsonNode node, String path, List<ValidationError> errors) {
        if (node.isString()) {
            if (node.asString().isBlank()) {
                errors.add(new ValidationError(path, "Nội dung không được để trống hoặc chỉ gồm khoảng trắng"));
            }
        } else if (node.isObject()) {
            node.properties().forEach(entry -> collectBlankTexts(entry.getValue(), path + "." + entry.getKey(), errors));
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                collectBlankTexts(node.get(i), path + "[" + i + "]", errors);
            }
        }
    }
}
