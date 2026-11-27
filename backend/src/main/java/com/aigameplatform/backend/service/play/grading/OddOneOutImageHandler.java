package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.opaque;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.orderingKey;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.service.factory.Ids;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Odd One Out dạng ảnh: ảnh có mã mờ theo phiên ("odd:a", "odd:b"...) đã xáo, bỏ {@code oddOneOutId}. */
@Component
public class OddOneOutImageHandler implements StudentGameHandler {

    private final PlayRecorder recorder;
    private final JsonMapper mapper;

    public OddOneOutImageHandler(PlayRecorder recorder, JsonMapper mapper) {
        this.recorder = recorder;
        this.mapper = mapper;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.ODD_ONE_OUT && game.getOddOneOutMode() == OddOneOutMode.IMAGE;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame question, int index) {
        String salt = context.salt();
        node.remove("oddOneOutId");
        node.put("renderMode", "IMAGE");
        List<ObjectNode> options = new ArrayList<>();
        for (JsonNode value : (ArrayNode) node.get("items")) {
            ObjectNode option = (ObjectNode) value;
            option.put("id", opaque(salt, index, "odd:" + option.get("id").asString()));
            options.add(option);
        }
        options.sort(Comparator.comparing(option -> orderingKey(salt, index, option.get("id").asString())));
        node.set("items", mapper.valueToTree(options));
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        OddOneOutQuestion question = (OddOneOutQuestion) c.question();
        Set<String> available = new HashSet<>();
        for (int i = 0; i < question.getImageItems().size(); i++)
            available.add(opaque(c.salt(), c.index(), "odd:" + Ids.positional(i)));
        return recorder.recordSingleChoice(c, "selectedItemId", available,
                opaque(c.salt(), c.index(), "odd:" + question.getOddOneOutId()));
    }
}
