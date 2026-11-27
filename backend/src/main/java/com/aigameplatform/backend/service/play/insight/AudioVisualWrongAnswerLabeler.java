package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import com.aigameplatform.backend.service.play.support.OpaqueIds;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Audio-Visual Match: mã "avm:0" là hình đúng, "avm:i" (i từ 1) là hình gây nhiễu thứ i-1. */
@Component
public class AudioVisualWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof AudioVisualMatchQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode selected = answer.get("selectedOptionId");
        if (salt == null || selected == null || !selected.isString()) return Optional.empty();
        AudioVisualMatchQuestion avm = (AudioVisualMatchQuestion) question;
        // Dùng chung cho phân bố đáp án: mã "avm:0" là hình đúng.
        if (OpaqueIds.opaque(salt, index, "avm:0").equals(selected.asString()) && avm.getCorrect() != null) {
            return Optional.ofNullable(avm.getCorrect().getVisualPrompt());
        }
        List<ImageChoice> distractors = avm.getDistractors();
        for (int i = 0; i < distractors.size(); i++) {
            if (OpaqueIds.opaque(salt, index,"avm:" + (i + 1)).equals(selected.asString())) {
                return Optional.ofNullable(distractors.get(i).getVisualPrompt());
            }
        }
        return Optional.empty();
    }
}
