package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AudioVisualMatchGameStrategy
        extends GameContentStrategy<AudioVisualMatchQuestionDsl, AudioVisualMatchQuestion> {

    public AudioVisualMatchGameStrategy(JsonMapper jsonMapper) {
        super(AudioVisualMatchQuestionDsl.class, AudioVisualMatchQuestion.class, jsonMapper);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, Subject subject, GradeLevel grade) {
        return "Môn: " + subjectLabel(subject) + ", " + gradeLabel(grade) + ". Chủ đề: " + topic
                + ". Mỗi câu cung cấp audioText để học sinh nghe, một lựa chọn correct và 1–3 distractors; "
                + "visualPrompt của mỗi lựa chọn phải mô tả hình ngắn gọn, không dùng chữ làm lộ đáp án.";
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
