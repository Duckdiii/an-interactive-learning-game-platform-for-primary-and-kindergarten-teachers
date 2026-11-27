package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.MatchingQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.MatchingPair;
import com.aigameplatform.backend.service.play.support.MatchingLayout;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Matching: nhãn là cặp nối sai đầu tiên của trẻ ("Mèo ↔ Cá"). */
@Component
public class MatchingWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof MatchingQuestion;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode matches = answer.get("matches");
        if (salt == null || matches == null || !matches.isArray()) return Optional.empty();
        MatchingLayout layout = new MatchingLayout((MatchingQuestion) question, salt, index);
        for (JsonNode match : matches) {
            JsonNode leftId = match.get("leftPairId");
            JsonNode rightId = match.get("rightPairId");
            if (leftId == null || rightId == null || !leftId.isString() || !rightId.isString()) continue;
            MatchingPair left = layout.leftPair(leftId.asString());
            MatchingPair right = layout.rightPair(rightId.asString());
            if (left == null || right == null || left == right) continue;
            String leftText = MatchingLayout.describe(left.getLeft());
            String rightText = MatchingLayout.describe(right.getRight());
            if (leftText != null && rightText != null) return Optional.of(leftText + " ↔ " + rightText);
        }
        return Optional.empty();
    }
}
