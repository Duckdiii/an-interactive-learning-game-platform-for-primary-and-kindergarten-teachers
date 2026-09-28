package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class VisualClozeGameDslFactory extends AbstractGameDslFactory<VisualClozeAiOutput, VisualClozeAiQuestion,
        VisualClozeQuestionDsl, VisualClozeGameDsl> {

    public VisualClozeGameDslFactory(RandomGenerator random) {
        super(GameType.VISUAL_CLOZE, VisualClozeAiOutput.class, random);
    }

    @Override
    protected List<VisualClozeAiQuestion> aiQuestionsOf(VisualClozeAiOutput output) {
        return output.questions();
    }

    @Override
    protected VisualClozeQuestionDsl createQuestion(VisualClozeAiQuestion ai, QuestionBase base) {
        return new VisualClozeQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                ai.visualPrompt(), null, ai.sentenceTemplate(), ai.correctAnswer(), ai.distractors());
    }

    @Override
    protected VisualClozeGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<VisualClozeQuestionDsl> questions) {
        return new VisualClozeGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
