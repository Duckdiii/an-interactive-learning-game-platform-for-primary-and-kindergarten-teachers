package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.OrderStepDsl;
import com.aigameplatform.backend.dto.dsl.OrderingGameDsl;
import com.aigameplatform.backend.dto.dsl.OrderingQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OrderingRule extends AbstractGameRule<OrderingGameDsl, OrderingQuestionDsl> {

    public OrderingRule() {
        super(GameType.ORDERING, OrderingGameDsl.class);
    }

    @Override
    protected List<OrderingQuestionDsl> questionsOf(OrderingGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(OrderingQuestionDsl question, String path, List<ValidationError> errors) {
        String stepsPath = path + ".steps";
        List<OrderStepDsl> steps = question.steps();
        int count = steps.size();

        RuleSupport.checkUnique(steps, OrderStepDsl::id, stepsPath, "id", errors);
        // Hai bước giống nhau thì thứ tự đúng không xác định được.
        RuleSupport.checkUnique(steps, s -> stepKey(s), stepsPath, "text", errors);

        for (int i = 0; i < count; i++) {
            int position = steps.get(i).correctPosition();
            if (position < 1 || position > count) {
                errors.add(new ValidationError(RuleSupport.elementPath(stepsPath, i, "correctPosition"),
                        "correctPosition phải nằm trong khoảng 1 đến " + count + " (số bước), đang là " + position));
            }
        }
        RuleSupport.checkUnique(steps, s -> String.valueOf(s.correctPosition()), stepsPath, "correctPosition", errors);
    }

    private static String stepKey(OrderStepDsl step) {
        if (step.text() != null && !step.text().isBlank()) {
            return "text:" + RuleSupport.normalize(step.text());
        }
        return "prompt:" + RuleSupport.normalize(step.visualPrompt());
    }
}
