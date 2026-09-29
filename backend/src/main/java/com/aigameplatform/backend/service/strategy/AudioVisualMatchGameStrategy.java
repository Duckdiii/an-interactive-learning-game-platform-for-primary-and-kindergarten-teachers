package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AudioVisualMatchGameStrategy
        extends GameContentStrategy<AudioVisualMatchQuestionDsl, AudioVisualMatchQuestion> {

    public AudioVisualMatchGameStrategy() {
        super(AudioVisualMatchQuestionDsl.class, AudioVisualMatchQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho AUDIO_VISUAL_MATCH");
    }

    @Override
    protected AudioVisualMatchQuestion toEntity(AudioVisualMatchQuestionDsl dsl) {
        AudioVisualMatchQuestion question = new AudioVisualMatchQuestion();
        question.setCorrect(ChoiceMapping.toEntity(dsl.correct()));
        question.setDistractors(new ArrayList<>(dsl.distractors().stream().map(ChoiceMapping::toEntity).toList()));
        return question;
    }

    @Override
    protected AudioVisualMatchQuestionDsl toDsl(AudioVisualMatchQuestion entity, String questionId) {
        return new AudioVisualMatchQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(),
                entity.getAudioText(), entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                ChoiceMapping.toDsl(entity.getCorrect()),
                entity.getDistractors().stream().map(ChoiceMapping::toDsl).toList());
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<AudioVisualMatchQuestionDsl> questions) {
        return new AudioVisualMatchGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.AUDIO_VISUAL_MATCH,
                metadata, settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.AUDIO_VISUAL_MATCH;
    }
}
