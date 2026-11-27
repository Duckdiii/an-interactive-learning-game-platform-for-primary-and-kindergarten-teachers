package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.MemoryCardQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.MemoryPair;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
public class MemoryCardWrongAnswerLabeler implements WrongAnswerLabeler {
    @Override
    public boolean supports(QuestionGame question) {
        return question instanceof MemoryCardQuestion;
    }

    @Override
    public boolean labelsRetryMistakes() {
        return true;
    }

    @Override
    public Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer) {
        return labels(question, index, salt, answer).stream().findFirst();
    }

    @Override
    public List<String> labels(QuestionGame question, int index, String salt, JsonNode answer) {
        JsonNode wrong = answer.path("wrongPairs");
        if (!wrong.isArray()) return List.of();
        Map<String, String> faces = new HashMap<>();
        for (MemoryPair pair : ((MemoryCardQuestion) question).getPairs()) {
            if (pair.getContent() == null) continue;
            String text = pair.getContent().getText();
            faces.put(pair.getPairId(), text == null || text.isBlank() ? pair.getContent().getVisualPrompt() : text);
        }
        List<String> labels = new ArrayList<>();
        for (JsonNode pair : wrong) {
            if (!pair.isArray() || pair.size() != 2) continue;
            String a = faces.get(pair.path(0).asString());
            String b = faces.get(pair.path(1).asString());
            if (a != null && !a.isBlank() && b != null && !b.isBlank()) labels.add(a + " ↔ " + b);
        }
        return labels;
    }
}
