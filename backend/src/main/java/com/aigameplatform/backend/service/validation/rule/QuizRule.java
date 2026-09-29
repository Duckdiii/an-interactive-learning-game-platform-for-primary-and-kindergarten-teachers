package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class QuizRule extends AbstractGameRule<QuizGameDsl, QuizQuestionDsl> {

    public QuizRule() {
        super(GameType.QUIZ, QuizGameDsl.class);
    }

    @Override
    protected List<QuizQuestionDsl> questionsOf(QuizGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        String optionsPath = path + ".options";
        RuleSupport.checkPositionalIds(question.options(), TextChoiceDsl::id, optionsPath, errors);
        RuleSupport.checkUnique(question.options(), o -> RuleSupport.normalize(o.text()), optionsPath, "text", errors);

        boolean correctExists = question.options().stream().anyMatch(o -> o.id().equals(question.correctOptionId()));
        if (!correctExists) {
            errors.add(new ValidationError(path + ".correctOptionId",
                    "correctOptionId \"" + question.correctOptionId() + "\" không thuộc danh sách options; "
                            + "phải là id của đúng một đáp án"));
        }
    }
}
