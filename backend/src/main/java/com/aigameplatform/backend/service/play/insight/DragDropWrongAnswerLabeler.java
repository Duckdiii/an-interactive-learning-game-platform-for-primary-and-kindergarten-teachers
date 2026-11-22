package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.DragDropQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.DraggableItem;
import com.aigameplatform.backend.entity.question.embedded.DropZone;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Drag &amp; Drop: nhãn là vật đầu tiên trẻ thả sai chỗ và vùng trẻ đã thả vào ("Mèo → Vùng cá"). */
@Component
public class DragDropWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof DragDropQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode placements = answer.get("placements");
        if (placements == null || !placements.isArray()) return Optional.empty();
        DragDropQuestion drag = (DragDropQuestion) question;
        for (JsonNode placement : placements) {
            JsonNode itemId = placement.get("itemId");
            JsonNode zoneId = placement.get("zoneId");
            if (itemId == null || zoneId == null || !itemId.isString() || !zoneId.isString()) continue;
            for (DraggableItem item : drag.getItems()) {
                if (!item.getItemId().equals(itemId.asString()) || item.getTargetZoneId().equals(zoneId.asString())) continue;
                Optional<String> zone = drag.getDropZones().stream().filter(z -> z.getZoneId().equals(zoneId.asString()))
                        .map(DropZone::getLabel).findFirst();
                if (item.getText() != null && zone.isPresent()) return Optional.of(item.getText() + " → " + zone.get());
            }
        }
        return Optional.empty();
    }
}
