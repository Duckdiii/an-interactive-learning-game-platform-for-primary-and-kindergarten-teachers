package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.service.generation.VisualClozeImageGenerationInput;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
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
    protected VisualClozeQuestionDsl createQuestion(VisualClozeAiQuestion ai, QuestionBase base,
            VisualClozeImageGenerationInput imageInput) {
        if (imageInput == null) return createQuestion(ai, base);
        if (ai.blanks() == null || ai.options() == null) {
            throw new IllegalArgumentException("IMAGE output requires blanks and options");
        }
        return new VisualClozeQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, null, null, null, ai.questionText(), imageInput.sceneImageUrl(),
                imageInput.sceneImage().width(), imageInput.sceneImage().height(),
                ai.blanks().stream().map(blank -> new VisualClozeBlankDsl(blank.id(), blank.x(), blank.y(),
                        blank.correctOptionId())).toList(),
                ai.options().stream().map(option -> new VisualClozeImageOptionDsl(option.id(),
                        option.visualPrompt(), option.imageUrl())).toList());
    }

    @Override
    protected VisualClozeGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<VisualClozeQuestionDsl> questions) {
        return new VisualClozeGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }

    @Override
    protected VisualClozeGameDsl assemble(GameMetadata metadata, GameplaySettings settings,
            List<VisualClozeQuestionDsl> questions, VisualClozeImageGenerationInput imageInput) {
        if (imageInput == null) return assemble(metadata, settings, questions);
        return new VisualClozeGameDsl(GameDslSchemaRegistry.VISUAL_CLOZE_IMAGE_VERSION, GameType.VISUAL_CLOZE,
                VisualClozeMode.IMAGE, metadata, settings, questions);
    }
}
