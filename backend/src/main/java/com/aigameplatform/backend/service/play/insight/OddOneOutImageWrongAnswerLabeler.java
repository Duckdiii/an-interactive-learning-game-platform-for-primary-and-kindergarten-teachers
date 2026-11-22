package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.OddOneOutImageItem;
import com.aigameplatform.backend.service.factory.Ids;
import com.aigameplatform.backend.service.play.support.OpaqueIds;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Odd One Out dạng ảnh: mã "odd:a", "odd:b"... theo vị trí của ảnh; nhãn là tên ảnh trẻ đã chọn. */
@Component
public class OddOneOutImageWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof OddOneOutQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode selected = answer.get("selectedItemId");
        if (salt == null || selected == null || !selected.isString()) return Optional.empty();
        List<OddOneOutImageItem> items = ((OddOneOutQuestion) question).getImageItems();
        for (int i = 0; i < items.size(); i++) {
            String id = OpaqueIds.opaque(salt, index,"odd:" + Ids.positional(i));
            if (id.equals(selected.asString())) return Optional.ofNullable(items.get(i).getLabel());
        }
        return Optional.empty();
    }
}
