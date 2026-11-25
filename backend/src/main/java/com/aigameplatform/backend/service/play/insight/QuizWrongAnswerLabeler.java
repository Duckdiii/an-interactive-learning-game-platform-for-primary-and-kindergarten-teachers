package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.service.factory.Ids;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Quiz: id lựa chọn theo vị trí ("a", "b"...), nhãn là chữ của lựa chọn trẻ đã chọn. */
@Component
public class QuizWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof QuizQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode selected = answer.get("selectedOptionId");
        if (selected == null || !selected.isString()) return Optional.empty();
        List<String> options = ((QuizQuestion) question).getOptions();
        for (int i = 0; i < options.size(); i++) {
            if (Ids.positional(i).equals(selected.asString())) return Optional.ofNullable(options.get(i));
        }
        return Optional.empty();
    }
}
