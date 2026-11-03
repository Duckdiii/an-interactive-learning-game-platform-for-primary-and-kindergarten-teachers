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
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class DragDropGameStrategy extends GameContentStrategy<DragDropQuestionDsl, DragDropQuestion> {

    public DragDropGameStrategy(JsonMapper jsonMapper) {
        super(DragDropQuestionDsl.class, DragDropQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn tạo game DRAG_DROP: người chơi kéo từng mục vào một drop zone phù hợp.
                Sinh DTO nội dung AI: dropZones gồm các object có label; mỗi item có text, visualPrompt và zoneIndex
                theo schema. zoneIndex là chỉ số bắt đầu từ 0 trong mảng dropZones, phải trỏ tới vùng hiện có.
                Factory tự tạo định danh và liên kết của DSL; không tự sinh ID.
                Nhãn zone và nội dung item phải cho thấy cách phân loại/ghép vị trí rõ ràng, có một cách đặt đúng theo YCCĐ.
                Không giả định hình ảnh đã tồn tại chỉ từ visualPrompt. Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Chọn thao tác kéo-thả có ý nghĩa với kỹ năng trong YCCĐ ở " + grade
                + "; không yêu cầu phân loại theo tiêu chí chưa được dạy hoặc không có trong căn cứ.";
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
