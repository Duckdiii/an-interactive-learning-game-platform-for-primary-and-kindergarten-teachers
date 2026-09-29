package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class OddOneOutGameDslFactory extends
        AbstractGameDslFactory<OddOneOutAiOutput, OddOneOutAiQuestion, OddOneOutQuestionDsl, OddOneOutGameDsl> {

    public OddOneOutGameDslFactory(RandomGenerator random) {
        super(GameType.ODD_ONE_OUT, OddOneOutAiOutput.class, random);
    }

    @Override
    protected List<OddOneOutAiQuestion> aiQuestionsOf(OddOneOutAiOutput output) {
        return output.questions();
    }

    @Override
    protected OddOneOutQuestionDsl createQuestion(OddOneOutAiQuestion ai, QuestionBase base) {
        List<Integer> order = ShuffleSupport.shuffledIndices(ai.items().size(), random);
        List<TextChoiceDsl> items = new ArrayList<>();
        String oddOneOutId = null;
        for (int position = 0; position < order.size(); position++) {
            int original = order.get(position);
            String id = Ids.positional(position);
            items.add(new TextChoiceDsl(id, ai.items().get(original)));
            if (original == ai.oddOneOutIndex()) {
                oddOneOutId = id;
            }
        }
        return new OddOneOutQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, items, oddOneOutId);
    }

    @Override
    protected OddOneOutGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<OddOneOutQuestionDsl> questions) {
        return new OddOneOutGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
