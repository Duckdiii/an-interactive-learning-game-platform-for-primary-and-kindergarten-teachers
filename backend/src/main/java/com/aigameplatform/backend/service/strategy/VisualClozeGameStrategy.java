package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;

public class VisualClozeGameStrategy extends GameContentStrategy<VisualClozeQuestionDsl, VisualClozeQuestion> {

    public VisualClozeGameStrategy() {
        super(VisualClozeQuestionDsl.class, VisualClozeQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho VISUAL_CLOZE");
    }

    @Override
    protected VisualClozeQuestion toEntity(VisualClozeQuestionDsl dsl) {
        VisualClozeQuestion question = new VisualClozeQuestion();
        question.setSentenceTemplate(dsl.sentenceTemplate());
        question.setCorrectAnswer(dsl.correctAnswer());
        question.setDistractors(new ArrayList<>(dsl.distractors()));
        return question;
    }

    @Override
    protected VisualClozeQuestionDsl toDsl(VisualClozeQuestion entity, String questionId) {
        return new VisualClozeQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), entity.getSentenceTemplate(),
                entity.getCorrectAnswer(), List.copyOf(entity.getDistractors()));
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<VisualClozeQuestionDsl> questions) {
        return new VisualClozeGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.VISUAL_CLOZE, metadata,
                settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.VISUAL_CLOZE;
    }
}
