package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.QuestionGame;
import java.util.List;

public class AudioVisualMatchGameStrategy extends GameContentStrategy {

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho AUDIO_VISUAL_MATCH");
    }

    @Override
    public List<QuestionGame> parseToQuestions(String rawJson) {
        // TODO: parse rawJson thành các câu hỏi AUDIO_VISUAL_MATCH theo JSON DSL Schema v1.0.0.
        throw new UnsupportedOperationException("Chưa cài đặt parseToQuestions cho AUDIO_VISUAL_MATCH");
    }

    @Override
    public GameType getSupportedType() {
        return GameType.AUDIO_VISUAL_MATCH;
    }
}
