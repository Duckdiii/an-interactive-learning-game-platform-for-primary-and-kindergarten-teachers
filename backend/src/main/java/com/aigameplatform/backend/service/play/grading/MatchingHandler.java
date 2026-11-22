package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.text;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.MatchingQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.MatchingPair;
import com.aigameplatform.backend.entity.question.embedded.PairSide;
import com.aigameplatform.backend.service.play.support.MatchingLayout;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Matching: tách {@code pairs} thành {@code leftItems} và {@code rightItems} đã xáo với mã {@code l1.. r1..}. Học sinh
 * nộp {@code matches: [{leftPairId, rightPairId}]} một lần; thiếu cặp thì chấm sai (đúng hết hoặc không).
 */
@Component
public class MatchingHandler implements StudentGameHandler {

    private final PlayRecorder recorder;
    private final JsonMapper mapper;

    public MatchingHandler(PlayRecorder recorder, JsonMapper mapper) {
        this.recorder = recorder;
        this.mapper = mapper;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.MATCHING;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame question, int index) {
        MatchingLayout layout = new MatchingLayout((MatchingQuestion) question, context.salt(), index);
        node.remove("pairs");
        node.set("leftItems", items(layout.left(), true));
        node.set("rightItems", items(layout.right(), false));
    }

    private ArrayNode items(List<MatchingPair> column, boolean left) {
        ArrayNode items = mapper.createArrayNode();
        for (int i = 0; i < column.size(); i++) {
            PairSide side = left ? column.get(i).getLeft() : column.get(i).getRight();
            ObjectNode item = items.addObject();
            item.put("id", left ? MatchingLayout.leftId(i) : MatchingLayout.rightId(i));
            if (side.getText() != null) item.put("text", side.getText());
            if (side.getVisualPrompt() != null) item.put("visualPrompt", side.getVisualPrompt());
            if (side.getImageUrl() != null) item.put("imageUrl", side.getImageUrl());
        }
        return items;
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        MatchingLayout layout = new MatchingLayout((MatchingQuestion) c.question(), c.salt(), c.index());
        Map<String, String> expected = new LinkedHashMap<>();
        for (String[] match : layout.correctMatches()) expected.put(match[0], match[1]);

        Map<String, String> submitted = new LinkedHashMap<>();
        if (c.outcome() == null) {
            JsonNode matches = c.request().get("matches");
            if (matches == null || !matches.isArray()) throw validation("matches must be an array");
            for (JsonNode match : matches) {
                String leftId = text(match, "leftPairId");
                String rightId = text(match, "rightPairId");
                if (layout.leftPair(leftId) == null) throw validation("matches must use known leftPairId");
                if (layout.rightPair(rightId) == null) throw validation("matches must use known rightPairId");
                if (submitted.put(leftId, rightId) != null) throw validation("each left item can be matched only once");
            }
            if (submitted.size() != submitted.values().stream().distinct().count())
                throw validation("each right item can be matched only once");
        }
        return recorder.recordGraded(c, Map.of("matches", list(submitted)), Map.of("matches", list(expected)),
                submitted.equals(expected));
    }

    private static List<Map<String, String>> list(Map<String, String> byLeft) {
        List<Map<String, String>> list = new ArrayList<>();
        byLeft.forEach((left, right) -> list.add(Map.of("leftPairId", left, "rightPairId", right)));
        return list;
    }
}
