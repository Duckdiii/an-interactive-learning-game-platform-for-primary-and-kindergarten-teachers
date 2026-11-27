package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.opaque;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.orderingKey;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Audio-Visual Match: gộp hình đúng và hình gây nhiễu thành {@code options} mã mờ đã xáo ("avm:0" là hình đúng). */
@Component
public class AudioVisualMatchHandler implements StudentGameHandler {

    private final PlayRecorder recorder;
    private final JsonMapper mapper;

    public AudioVisualMatchHandler(PlayRecorder recorder, JsonMapper mapper) {
        this.recorder = recorder;
        this.mapper = mapper;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.AUDIO_VISUAL_MATCH;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame base, int index) {
        AudioVisualMatchQuestion question = (AudioVisualMatchQuestion) base;
        String salt = context.salt();
        node.remove(List.of("correct", "distractors", "visualPrompt", "imageUrl"));
        var choices = new ArrayList<ImageChoice>();
        choices.add(question.getCorrect());
        choices.addAll(question.getDistractors());
        List<ObjectNode> options = new ArrayList<>();
        for (int i = 0; i < choices.size(); i++) {
            var choice = choices.get(i);
            ObjectNode option = mapper.createObjectNode();
            option.put("id", opaque(salt, index, "avm:" + i));
            option.put("visualPrompt", choice.getVisualPrompt());
            if (choice.getImageUrl() != null) option.put("imageUrl", choice.getImageUrl());
            options.add(option);
        }
        options.sort(Comparator.comparing(option -> orderingKey(salt, index, option.get("id").asString())));
        node.set("options", mapper.valueToTree(options));
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        AudioVisualMatchQuestion question = (AudioVisualMatchQuestion) c.question();
        Set<String> available = new HashSet<>();
        for (int i = 0; i <= question.getDistractors().size(); i++) available.add(opaque(c.salt(), c.index(), "avm:" + i));
        return recorder.recordSingleChoice(c, "selectedOptionId", available, opaque(c.salt(), c.index(), "avm:0"));
    }
}
