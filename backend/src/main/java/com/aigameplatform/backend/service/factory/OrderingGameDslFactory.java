package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OrderStepDsl;
import com.aigameplatform.backend.dto.dsl.OrderingGameDsl;
import com.aigameplatform.backend.dto.dsl.OrderingQuestionDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiStep;
import com.aigameplatform.backend.dto.dsl.ai.OrderingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OrderingAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class OrderingGameDslFactory extends
        AbstractGameDslFactory<OrderingAiOutput, OrderingAiQuestion, OrderingQuestionDsl, OrderingGameDsl> {

    public OrderingGameDslFactory(RandomGenerator random) {
        super(GameType.ORDERING, OrderingAiOutput.class, random);
    }

    @Override
    protected List<OrderingAiQuestion> aiQuestionsOf(OrderingAiOutput output) {
        return output.questions();
    }

    @Override
    protected OrderingQuestionDsl createQuestion(OrderingAiQuestion ai, QuestionBase base) {
        // AI liệt kê theo thứ tự đúng: vị trí gốc chính là correctPosition. Thứ tự hiển thị phải khác thứ tự đúng.
        List<Integer> order = ShuffleSupport.shuffledNotIdentity(ai.steps().size(), random);
        List<OrderStepDsl> steps = new ArrayList<>();
        for (int display = 0; display < order.size(); display++) {
            int original = order.get(display);
            AiStep step = ai.steps().get(original);
            steps.add(new OrderStepDsl(Ids.numbered("s", display), step.text(), step.visualPrompt(), null, original + 1));
        }
        return new OrderingQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, steps);
    }

    @Override
    protected OrderingGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<OrderingQuestionDsl> questions) {
        return new OrderingGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
