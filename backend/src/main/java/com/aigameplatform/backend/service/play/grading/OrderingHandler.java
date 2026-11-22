package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.service.play.support.OrderingLayout;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Ordering: học sinh nộp {@code order: [id, ...]}; bỏ {@code correctPosition} và xáo các bước theo salt phiên. */
@Component
public class OrderingHandler implements StudentGameHandler {

    private final PlayRecorder recorder;

    public OrderingHandler(PlayRecorder recorder) {
        this.recorder = recorder;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.ORDERING;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame question, int index) {
        OrderingLayout layout = new OrderingLayout((OrderingQuestion) question, context.salt(), index);
        ArrayNode original = (ArrayNode) node.get("steps");
        ArrayNode shuffled = original.arrayNode();
        Map<Integer, JsonNode> byPosition = new java.util.HashMap<>(); // correctPosition là duy nhất (Layer 2)
        for (JsonNode step : original) byPosition.put(step.get("correctPosition").asInt(), step);
        for (int i = 0; i < layout.byDisplay().size(); i++) {
            ObjectNode copy = ((ObjectNode) byPosition.get(layout.byDisplay().get(i).getCorrectPosition())).deepCopy();
            copy.remove("correctPosition");
            copy.put("id", OrderingLayout.displayId(i));
            shuffled.add(copy);
        }
        node.set("steps", shuffled);
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        OrderingLayout layout = new OrderingLayout((OrderingQuestion) c.question(), c.salt(), c.index());
        List<String> correct = layout.correctOrder();
        List<String> submitted = new ArrayList<>();
        if (c.outcome() == null) {
            JsonNode order = c.request().get("order");
            if (order == null || !order.isArray()) throw validation("order must be an array of step ids");
            for (JsonNode id : order) {
                if (!id.isString()) throw validation("order must contain step ids");
                submitted.add(id.asString());
            }
            if (submitted.size() != correct.size() || !new HashSet<>(submitted).equals(new HashSet<>(correct)))
                throw validation("order must list every step exactly once");
        }
        return recorder.recordGraded(c, Map.of("order", submitted), Map.of("order", correct), submitted.equals(correct));
    }
}
