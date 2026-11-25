package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.SpotTheTargetQuestion;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Spot the Target: nhãn theo hướng chạm lệch so với tâm đích ("Gần đích (lệch sang phải)"). Chỉ có 8 nhãn nên các lần
 * chạm sai giống nhau gộp lại được; "gần" là trong vòng 2 lần bán kính vùng đích.
 */
@Component
public class SpotTheTargetWrongAnswerLabeler implements WrongAnswerLabeler {

    private static final double NEAR_FACTOR = 2.0;

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof SpotTheTargetQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        SpotTheTargetQuestion target = (SpotTheTargetQuestion) question;
        JsonNode x = answer.get("x");
        JsonNode y = answer.get("y");
        if (target.getHitRegionX() == null || target.getHitRegionY() == null || target.getHitRegionRadius() == null
                || x == null || y == null || !x.isNumber() || !y.isNumber()) return Optional.empty();
        double dx = x.asDouble() - target.getHitRegionX();
        double dy = y.asDouble() - target.getHitRegionY(); // y tăng khi đi xuống dưới ảnh
        String distance = Math.hypot(dx, dy) <= NEAR_FACTOR * target.getHitRegionRadius() ? "Gần đích" : "Xa đích";
        String direction = Math.abs(dx) >= Math.abs(dy)
                ? (dx > 0 ? "sang phải" : "sang trái")
                : (dy > 0 ? "xuống dưới" : "lên trên");
        return Optional.of(distance + " (lệch " + direction + ")");
    }
}
