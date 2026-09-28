package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.DragDropGameDsl;
import com.aigameplatform.backend.dto.dsl.DragDropQuestionDsl;
import com.aigameplatform.backend.dto.dsl.DraggableItemDsl;
import com.aigameplatform.backend.dto.dsl.DropZoneDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.ai.AiDragItem;
import com.aigameplatform.backend.dto.dsl.ai.DragDropAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.DragDropAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class DragDropGameDslFactory extends
        AbstractGameDslFactory<DragDropAiOutput, DragDropAiQuestion, DragDropQuestionDsl, DragDropGameDsl> {

    public DragDropGameDslFactory(RandomGenerator random) {
        super(GameType.DRAG_DROP, DragDropAiOutput.class, random);
    }

    @Override
    protected List<DragDropAiQuestion> aiQuestionsOf(DragDropAiOutput output) {
        return output.questions();
    }

    @Override
    protected DragDropQuestionDsl createQuestion(DragDropAiQuestion ai, QuestionBase base) {
        List<DropZoneDsl> zones = new ArrayList<>();
        for (int i = 0; i < ai.dropZones().size(); i++) {
            zones.add(new DropZoneDsl(Ids.numbered("z", i), ai.dropZones().get(i).label()));
        }
        // AI thường xếp các vật cùng rổ cạnh nhau; xáo rồi đánh id theo thứ tự hiển thị.
        List<AiDragItem> shuffled = ShuffleSupport.pick(ai.items(), ShuffleSupport.shuffledIndices(ai.items().size(), random));
        List<DraggableItemDsl> items = new ArrayList<>();
        for (int i = 0; i < shuffled.size(); i++) {
            AiDragItem item = shuffled.get(i);
            items.add(new DraggableItemDsl(Ids.numbered("i", i), item.text(), item.visualPrompt(), null,
                    Ids.numbered("z", item.zoneIndex())));
        }
        return new DragDropQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, zones, items);
    }

    @Override
    protected DragDropGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<DragDropQuestionDsl> questions) {
        return new DragDropGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
