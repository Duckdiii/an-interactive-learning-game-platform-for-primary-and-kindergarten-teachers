package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.QuestionGame;
import java.util.List;

public class OddOneOutGameStrategy extends GameContentStrategy {

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho ODD_ONE_OUT");
    }

    @Override
    public List<QuestionGame> parseToQuestions(String rawJson) {
        // TODO: parse rawJson thành các câu hỏi ODD_ONE_OUT theo JSON DSL Schema v1.0.0.
        throw new UnsupportedOperationException("Chưa cài đặt parseToQuestions cho ODD_ONE_OUT");
    }

    @Override
    public GameType getSupportedType() {
        return GameType.ODD_ONE_OUT;
    }
}
