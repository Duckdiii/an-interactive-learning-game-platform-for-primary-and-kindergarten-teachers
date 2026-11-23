package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.text;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.DragDropQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.DraggableItem;
import com.aigameplatform.backend.entity.question.embedded.DropZone;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Drag &amp; Drop: id vật và vùng là id thật trong DSL (không bí mật), chỉ bỏ {@code targetZoneId}. Học sinh nộp
 * {@code placements: [{itemId, zoneId}]} một lần; thiếu vật thì chấm sai (đúng hết hoặc không), giống Matching.
 */
@Component
public class DragDropHandler implements StudentGameHandler {

    private final PlayRecorder recorder;

    public DragDropHandler(PlayRecorder recorder) {
        this.recorder = recorder;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.DRAG_DROP;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame question, int index) {
        for (JsonNode item : (ArrayNode) node.get("items")) ((ObjectNode) item).remove("targetZoneId");
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        DragDropQuestion question = (DragDropQuestion) c.question();
        Map<String, String> expected = new LinkedHashMap<>();
        for (DraggableItem item : question.getItems()) expected.put(item.getItemId(), item.getTargetZoneId());
        Map<String, Object> correctAnswer = Map.of("placements", placementList(expected));

        Map<String, String> placed = new LinkedHashMap<>();
        if (c.outcome() == null) {
            JsonNode placements = c.request().get("placements");
            if (placements == null || !placements.isArray()) throw validation("placements must be an array");
            Set<String> zones = new HashSet<>();
            for (DropZone zone : question.getDropZones()) zones.add(zone.getZoneId());
            for (JsonNode placement : placements) {
                String itemId = text(placement, "itemId");
                String zoneId = text(placement, "zoneId");
                if (itemId == null || !expected.containsKey(itemId)) throw validation("placements must use known itemId");
                if (zoneId == null || !zones.contains(zoneId)) throw validation("placements must use known zoneId");
                if (placed.put(itemId, zoneId) != null) throw validation("each item can be placed only once");
            }
        }
        return recorder.recordGraded(c, Map.of("placements", placementList(placed)), correctAnswer, placed.equals(expected));
    }

    private static List<Map<String, String>> placementList(Map<String, String> byItem) {
        List<Map<String, String>> list = new ArrayList<>();
        byItem.forEach((itemId, zoneId) -> list.add(Map.of("itemId", itemId, "zoneId", zoneId)));
        return list;
    }
}
