package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OddOneOutRule extends AbstractGameRule<OddOneOutGameDsl, OddOneOutQuestionDsl> {

    public OddOneOutRule() {
        super(GameType.ODD_ONE_OUT, OddOneOutGameDsl.class);
    }

    @Override
    protected List<OddOneOutQuestionDsl> questionsOf(OddOneOutGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(OddOneOutQuestionDsl question, String path, List<ValidationError> errors) {
        String itemsPath = path + ".items";
        RuleSupport.checkPositionalIds(question.items(), TextChoiceDsl::id, itemsPath, errors);
        RuleSupport.checkUnique(question.items(), i -> RuleSupport.normalize(i.text()), itemsPath, "text", errors);

        boolean oddExists = question.items().stream().anyMatch(i -> i.id().equals(question.oddOneOutId()));
        if (!oddExists) {
            errors.add(new ValidationError(path + ".oddOneOutId",
                    "oddOneOutId \"" + question.oddOneOutId() + "\" không thuộc danh sách items"));
        }
    }
}
