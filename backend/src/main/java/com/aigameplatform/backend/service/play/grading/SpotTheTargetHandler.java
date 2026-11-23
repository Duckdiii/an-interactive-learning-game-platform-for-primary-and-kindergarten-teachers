package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.SpotTheTargetQuestion;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Spot the Target: học sinh nộp toạ độ chạm {@code x, y} (tỉ lệ 0-1 so với ảnh); đúng khi nằm trong bán kính vùng đích. */
@Component
public class SpotTheTargetHandler implements StudentGameHandler {

    private final PlayRecorder recorder;

    public SpotTheTargetHandler(PlayRecorder recorder) {
        this.recorder = recorder;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.SPOT_THE_TARGET;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame question, int index) {
        node.remove("hitRegion"); // vùng đúng chính là đáp án
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        SpotTheTargetQuestion question = (SpotTheTargetQuestion) c.question();
        if (question.getHitRegionX() == null || question.getHitRegionY() == null || question.getHitRegionRadius() == null)
            throw validation("This question has no target region yet");
        Map<String, Object> tap = new LinkedHashMap<>();
        boolean correct = false;
        if (c.outcome() == null) {
            double x = coordinate(c.request(), "x");
            double y = coordinate(c.request(), "y");
            tap.put("x", x);
            tap.put("y", y);
            correct = Math.hypot(x - question.getHitRegionX(), y - question.getHitRegionY()) <= question.getHitRegionRadius();
        }
        return recorder.recordGraded(c, tap, Map.of("x", question.getHitRegionX(), "y", question.getHitRegionY(),
                "radius", question.getHitRegionRadius()), correct);
    }

    private static double coordinate(JsonNode request, String key) {
        JsonNode value = request.get(key);
        if (value == null || !value.isNumber()) throw validation(key + " must be a number between 0 and 1");
        double number = value.asDouble();
        if (!(number >= 0 && number <= 1)) throw validation(key + " must be a number between 0 and 1");
        return number;
    }
}
