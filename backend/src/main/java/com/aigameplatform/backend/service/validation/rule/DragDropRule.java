package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.DragDropGameDsl;
import com.aigameplatform.backend.dto.dsl.DragDropQuestionDsl;
import com.aigameplatform.backend.dto.dsl.DraggableItemDsl;
import com.aigameplatform.backend.dto.dsl.DropZoneDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class DragDropRule extends AbstractGameRule<DragDropGameDsl, DragDropQuestionDsl> {

    public DragDropRule() {
        super(GameType.DRAG_DROP, DragDropGameDsl.class);
    }

    @Override
    protected List<DragDropQuestionDsl> questionsOf(DragDropGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(DragDropQuestionDsl question, String path, List<ValidationError> errors) {
        String zonesPath = path + ".dropZones";
        String itemsPath = path + ".items";
        List<DropZoneDsl> zones = question.dropZones();
        List<DraggableItemDsl> items = question.items();

        RuleSupport.checkUnique(zones, DropZoneDsl::id, zonesPath, "id", errors);
        RuleSupport.checkUnique(zones, z -> RuleSupport.normalize(z.label()), zonesPath, "label", errors);
        RuleSupport.checkUnique(items, DraggableItemDsl::id, itemsPath, "id", errors);

        Set<String> zoneIds = new HashSet<>();
        zones.forEach(z -> zoneIds.add(z.id()));

        Set<String> usedZoneIds = new HashSet<>();
        for (int i = 0; i < items.size(); i++) {
            String target = items.get(i).targetZoneId();
            if (zoneIds.contains(target)) {
                usedZoneIds.add(target);
            } else {
                errors.add(new ValidationError(RuleSupport.elementPath(itemsPath, i, "targetZoneId"),
                        "targetZoneId \"" + target + "\" không có trong dropZones"));
            }
        }

        for (int i = 0; i < zones.size(); i++) {
            if (!usedZoneIds.contains(zones.get(i).id())) {
                errors.add(new ValidationError(RuleSupport.elementPath(zonesPath, i, null),
                        "Vùng thả \"" + zones.get(i).id() + "\" không có vật nào thuộc về nó"));
            }
        }
    }
}
