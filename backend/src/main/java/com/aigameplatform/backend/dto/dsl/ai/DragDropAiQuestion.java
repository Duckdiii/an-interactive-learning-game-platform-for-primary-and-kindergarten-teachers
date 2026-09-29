package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DragDropAiQuestion(
        List<AiDropZone> dropZones,
        List<AiDragItem> items,
        String audioText) implements AiQuestion {

    @Override
    public List<String> problems() {
        List<String> problems = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            int zone = items.get(i).zoneIndex();
            if (zone < 0 || zone >= dropZones.size()) {
                problems.add("items[" + i + "].zoneIndex phải nhỏ hơn số vùng thả (" + dropZones.size() + ")");
            }
        }
        return problems;
    }
}
