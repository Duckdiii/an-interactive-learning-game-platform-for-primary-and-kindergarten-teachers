package com.aigameplatform.backend.entity.question;

import com.aigameplatform.backend.entity.question.embedded.DraggableItem;
import com.aigameplatform.backend.entity.question.embedded.DropZone;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "drag_drop_questions")
@Getter
@Setter
@NoArgsConstructor
public class DragDropQuestion extends QuestionGame {

    // Composition: vùng thả và vật kéo chết theo câu hỏi.
    @ElementCollection
    @CollectionTable(name = "drag_drop_zones", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "zone_order")
    private List<DropZone> dropZones = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "drag_drop_items", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "item_order")
    private List<DraggableItem> items = new ArrayList<>();
}
