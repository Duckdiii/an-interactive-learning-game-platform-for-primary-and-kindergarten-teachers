package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class VisualClozeRule extends AbstractGameRule<VisualClozeGameDsl, VisualClozeQuestionDsl> {

    private static final String BLANK = "___";
    private static final Pattern UNDERSCORE_RUN = Pattern.compile("_{3,}");

    public VisualClozeRule() {
        super(GameType.VISUAL_CLOZE, VisualClozeGameDsl.class);
    }

    @Override
    protected List<VisualClozeQuestionDsl> questionsOf(VisualClozeGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(VisualClozeQuestionDsl question, String path, List<ValidationError> errors) {
        checkSingleBlank(question.sentenceTemplate(), path + ".sentenceTemplate", errors);

        // Đáp án đúng và các từ nhiễu phải khác nhau, nếu không sẽ có hai đáp án đúng.
        List<String> all = new ArrayList<>();
        all.add(question.correctAnswer());
        all.addAll(question.distractors());
        RuleSupport.checkUnique(all, RuleSupport::normalize,
                i -> i == 0 ? path + ".correctAnswer" : path + ".distractors[" + (i - 1) + "]", errors);
    }

    private static void checkSingleBlank(String template, String path, List<ValidationError> errors) {
        Matcher matcher = UNDERSCORE_RUN.matcher(template);
        int blanks = 0;
        boolean exactLength = true;
        while (matcher.find()) {
            blanks++;
            exactLength &= matcher.group().equals(BLANK);
        }
        if (blanks != 1 || !exactLength) {
            errors.add(new ValidationError(path,
                    "sentenceTemplate phải có đúng một chỗ trống \"" + BLANK + "\" (3 dấu gạch dưới)"));
        }
    }
}
