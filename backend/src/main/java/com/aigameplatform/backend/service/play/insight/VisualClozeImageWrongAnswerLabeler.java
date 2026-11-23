package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeImageOption;
import com.aigameplatform.backend.service.play.support.OpaqueIds;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
public class VisualClozeImageWrongAnswerLabeler implements WrongAnswerLabeler {

    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof VisualClozeQuestion cloze && !cloze.getBlanks().isEmpty();
    }

    @Override
    public boolean labelsRetryMistakes() {
        return true;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode mistake = answer.path("firstWrongPlacement");
        if (salt == null || salt.isBlank() || !mistake.isObject()) return Optional.empty();

        VisualClozeQuestion cloze = (VisualClozeQuestion) question;
        String blankId = mistake.path("blankId").asString();
        String optionId = mistake.path("optionId").asString();
        for (int i = 0; i < cloze.getBlanks().size(); i++) {
            var blank = cloze.getBlanks().get(i);
            if (!OpaqueIds.opaque(salt, index, "blank:" + blank.getBlankId()).equals(blankId)) continue;
            int position = i + 1;
            return cloze.getOptions().stream()
                    .filter(option -> !option.getOptionId().equals(blank.getCorrectOptionId()))
                    .filter(option -> OpaqueIds.opaque(salt, index, "option:" + option.getOptionId()).equals(optionId))
                    .map(VisualClozeImageOption::getVisualPrompt)
                    .filter(prompt -> prompt != null && !prompt.isBlank())
                    .map(prompt -> "Ô " + position + ": " + prompt)
                    .findFirst();
        }
        return Optional.empty();
    }
}
