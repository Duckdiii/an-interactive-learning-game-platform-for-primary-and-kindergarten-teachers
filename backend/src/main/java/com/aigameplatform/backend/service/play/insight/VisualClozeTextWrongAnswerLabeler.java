package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Visual Cloze nhập chữ: đáp án sai chính là chữ trẻ đã gõ. */
@Component
public class VisualClozeTextWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof VisualClozeQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode typed = answer.get("answer");
        return typed != null && typed.isString() ? Optional.of(typed.asString()) : Optional.empty();
    }
}
