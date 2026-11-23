package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.service.play.support.OrderingLayout;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Ordering: nhãn là bước trẻ đặt sai chỗ đầu tiên, kèm vị trí trẻ đặt ("Vị trí 1: đánh răng"). */
@Component
public class OrderingWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof OrderingQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode order = answer.get("order");
        if (salt == null || order == null || !order.isArray()) return Optional.empty();
        OrderingLayout layout = new OrderingLayout((OrderingQuestion) question, salt, index);
        List<String> correct = layout.correctOrder();
        for (int i = 0; i < order.size() && i < correct.size(); i++) {
            JsonNode id = order.get(i);
            if (!id.isString() || id.asString().equals(correct.get(i))) continue;
            String text = layout.textOf(id.asString());
            return text == null ? Optional.empty() : Optional.of("Vị trí " + (i + 1) + ": " + text);
        }
        return Optional.empty();
    }
}
