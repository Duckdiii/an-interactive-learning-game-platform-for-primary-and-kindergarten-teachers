package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl;
import com.aigameplatform.backend.dto.dsl.ImageChoiceDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AudioVisualMatchRule extends AbstractGameRule<AudioVisualMatchGameDsl, AudioVisualMatchQuestionDsl> {

    public AudioVisualMatchRule() {
        super(GameType.AUDIO_VISUAL_MATCH, AudioVisualMatchGameDsl.class);
    }

    @Override
    protected List<AudioVisualMatchQuestionDsl> questionsOf(AudioVisualMatchGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(AudioVisualMatchQuestionDsl question, String path, List<ValidationError> errors) {
        // Hình đúng và các hình nhiễu phải khác nhau, nếu không trẻ không phân biệt được.
        List<ImageChoiceDsl> all = new ArrayList<>();
        all.add(question.correct());
        all.addAll(question.distractors());
        RuleSupport.checkUnique(all, c -> RuleSupport.normalize(c.visualPrompt()),
                i -> i == 0 ? path + ".correct.visualPrompt" : path + ".distractors[" + (i - 1) + "].visualPrompt",
                errors);
    }
}
