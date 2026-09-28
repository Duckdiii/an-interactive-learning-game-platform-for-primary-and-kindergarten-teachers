package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.DragDropGameDsl;
import com.aigameplatform.backend.dto.dsl.DragDropQuestionDsl;
import com.aigameplatform.backend.dto.dsl.DraggableItemDsl;
import com.aigameplatform.backend.dto.dsl.DropZoneDsl;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.DragDropQuestion;
import com.aigameplatform.backend.entity.question.embedded.DraggableItem;
import com.aigameplatform.backend.entity.question.embedded.DropZone;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;

public class DragDropGameStrategy extends GameContentStrategy<DragDropQuestionDsl, DragDropQuestion> {

    public DragDropGameStrategy() {
        super(DragDropQuestionDsl.class, DragDropQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho DRAG_DROP");
    }

    @Override
    protected DragDropQuestion toEntity(DragDropQuestionDsl dsl) {
        List<DropZone> zones = new ArrayList<>();
        for (DropZoneDsl zoneDsl : dsl.dropZones()) {
            DropZone zone = new DropZone();
            zone.setZoneId(zoneDsl.id());
            zone.setLabel(zoneDsl.label());
            zones.add(zone);
        }
        List<DraggableItem> items = new ArrayList<>();
        for (DraggableItemDsl itemDsl : dsl.items()) {
            DraggableItem item = new DraggableItem();
            item.setItemId(itemDsl.id());
            item.setText(itemDsl.text());
            item.setVisualPrompt(itemDsl.visualPrompt());
            item.setImageUrl(itemDsl.imageUrl());
            item.setTargetZoneId(itemDsl.targetZoneId());
            items.add(item);
        }
        DragDropQuestion question = new DragDropQuestion();
        question.setDropZones(zones);
        question.setItems(items);
        return question;
    }

    @Override
    protected DragDropQuestionDsl toDsl(DragDropQuestion entity, String questionId) {
        List<DropZoneDsl> zones = entity.getDropZones().stream()
                .map(zone -> new DropZoneDsl(zone.getZoneId(), zone.getLabel())).toList();
        List<DraggableItemDsl> items = entity.getItems().stream()
                .map(item -> new DraggableItemDsl(item.getItemId(), item.getText(), item.getVisualPrompt(),
                        item.getImageUrl(), item.getTargetZoneId()))
                .toList();
        return new DragDropQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), zones, items);
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<DragDropQuestionDsl> questions) {
        return new DragDropGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.DRAG_DROP, metadata, settings,
                questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.DRAG_DROP;
    }
}
