package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.orderingKey;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Visual Cloze nhập chữ: đề giữ {@code options} (đáp án đúng và gây nhiễu) đã xáo, trẻ gõ {@code answer}. */
@Component
public class VisualClozeTextHandler implements StudentGameHandler {

    private final PlayRecorder recorder;
    private final JsonMapper mapper;

    public VisualClozeTextHandler(PlayRecorder recorder, JsonMapper mapper) {
        this.recorder = recorder;
        this.mapper = mapper;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.VISUAL_CLOZE && game.effectiveVisualClozeMode() == VisualClozeMode.TEXT;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame base, int index) {
        VisualClozeQuestion question = (VisualClozeQuestion) base;
        node.remove("correctAnswer");
        node.remove("distractors");
        List<String> choices = new ArrayList<>();
        choices.add(question.getCorrectAnswer());
        choices.addAll(question.getDistractors());
        choices.sort(Comparator.comparing(value -> orderingKey(context.salt(), index, value)));
        node.set("options", mapper.valueToTree(choices));
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        return recorder.recordTyped(c, "answer", ((VisualClozeQuestion) c.question()).getCorrectAnswer());
    }
}
