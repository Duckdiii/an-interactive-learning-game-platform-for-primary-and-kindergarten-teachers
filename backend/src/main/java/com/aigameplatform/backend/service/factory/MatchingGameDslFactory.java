package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.MatchingGameDsl;
import com.aigameplatform.backend.dto.dsl.MatchingPairDsl;
import com.aigameplatform.backend.dto.dsl.MatchingQuestionDsl;
import com.aigameplatform.backend.dto.dsl.PairSideDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiSide;
import com.aigameplatform.backend.dto.dsl.ai.MatchingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.MatchingAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class MatchingGameDslFactory extends
        AbstractGameDslFactory<MatchingAiOutput, MatchingAiQuestion, MatchingQuestionDsl, MatchingGameDsl> {

    public MatchingGameDslFactory(RandomGenerator random) {
        super(GameType.MATCHING, MatchingAiOutput.class, random);
    }

    @Override
    protected List<MatchingAiQuestion> aiQuestionsOf(MatchingAiOutput output) {
        return output.questions();
    }

    @Override
    protected MatchingQuestionDsl createQuestion(MatchingAiQuestion ai, QuestionBase base) {
        List<MatchingPairDsl> pairs = new ArrayList<>();
        for (int i = 0; i < ai.pairs().size(); i++) {
            var pair = ai.pairs().get(i);
            pairs.add(new MatchingPairDsl(Ids.numbered("p", i), side(pair.left()), side(pair.right())));
        }
        return new MatchingQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, pairs);
    }

    @Override
    protected MatchingGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<MatchingQuestionDsl> questions) {
        return new MatchingGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }

    private static PairSideDsl side(AiSide ai) {
        return new PairSideDsl(ai.text(), ai.visualPrompt(), null);
    }
}
