package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.MemoryCardGameDsl;
import com.aigameplatform.backend.dto.dsl.MemoryCardQuestionDsl;
import com.aigameplatform.backend.dto.dsl.MemoryPairDsl;
import com.aigameplatform.backend.dto.dsl.PairSideDsl;
import com.aigameplatform.backend.dto.dsl.ai.MemoryCardAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.MemoryCardAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class MemoryCardGameDslFactory extends
        AbstractGameDslFactory<MemoryCardAiOutput, MemoryCardAiQuestion, MemoryCardQuestionDsl, MemoryCardGameDsl> {

    public MemoryCardGameDslFactory(RandomGenerator random) {
        super(GameType.MEMORY_CARD, MemoryCardAiOutput.class, random);
    }

    @Override
    protected List<MemoryCardAiQuestion> aiQuestionsOf(MemoryCardAiOutput output) {
        return output.questions();
    }

    @Override
    protected MemoryCardQuestionDsl createQuestion(MemoryCardAiQuestion ai, QuestionBase base) {
        List<MemoryPairDsl> pairs = new ArrayList<>();
        for (int i = 0; i < ai.pairs().size(); i++) {
            var card = ai.pairs().get(i);
            pairs.add(new MemoryPairDsl(Ids.numbered("p", i), new PairSideDsl(card.text(), card.visualPrompt(), null)));
        }
        return new MemoryCardQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, pairs);
    }

    @Override
    protected MemoryCardGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<MemoryCardQuestionDsl> questions) {
        return new MemoryCardGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
