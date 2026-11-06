package com.aigameplatform.backend.service.validation.cpf;

import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.GameValidationContext;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.safety.GameTextExtractor.TextEntry;
import java.util.ArrayList;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * Layer 3 của CPF: kiểm an toàn đúng những trường người đọc thấy (docs/cpf-game-v2.0.0.md mục 4.3). Không gom id,
 * assetId hay giá trị enum (vùng, chuyển động, tên hiệu ứng) vì chúng không phải nội dung.
 */
final class CpfSafetyValidator extends AbstractGameValidator {

    private final ContentSafetyCheck safetyCheck;

    CpfSafetyValidator(ContentSafetyCheck safetyCheck) {
        this.safetyCheck = safetyCheck;
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        return safetyCheck.check(readableTexts(context.getJson()));
    }

    static List<TextEntry> readableTexts(JsonNode game) {
        List<TextEntry> texts = new ArrayList<>();
        add(texts, "$.metadata.title", game.path("metadata").path("title"));
        add(texts, "$.metadata.topic", game.path("metadata").path("topic"));
        add(texts, "$.content.instruction", game.path("content").path("instruction"));
        JsonNode rounds = game.path("content").path("rounds");
        for (int r = 0; r < rounds.size(); r++) {
            String path = "$.content.rounds[" + r + "]";
            add(texts, path + ".prompt", rounds.get(r).path("prompt"));
            for (String list : List.of("choices", "zones")) {
                JsonNode items = rounds.get(r).path(list);
                for (int i = 0; i < items.size(); i++) {
                    add(texts, path + "." + list + "[" + i + "].label", items.get(i).path("label"));
                }
            }
        }
        return texts;
    }

    private static void add(List<TextEntry> texts, String path, JsonNode node) {
        if (node.isString()) texts.add(new TextEntry(path, node.asString()));
    }
}
