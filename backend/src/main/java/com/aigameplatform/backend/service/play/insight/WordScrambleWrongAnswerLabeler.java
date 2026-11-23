package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.WordScrambleQuestion;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Word Scramble: đáp án sai chính là từ trẻ đã ghép (chữ do trẻ gõ). */
@Component
public class WordScrambleWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof WordScrambleQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode word = answer.get("word");
        return word != null && word.isString() ? Optional.of(word.asString()) : Optional.empty();
    }
}
