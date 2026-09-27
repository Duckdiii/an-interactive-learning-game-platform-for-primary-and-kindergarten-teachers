package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.QuestionGame;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public abstract class GameContentStrategy {

    protected String id;

    protected String promptTemplate;

    private String jsonSchemaDefinition;

    public String buildPrompt(String topic, GradeLevel grade) {
        if (promptTemplate == null) {
            throw new IllegalStateException("promptTemplate chưa được cấu hình cho " + getSupportedType());
        }
        return promptTemplate + "\n\n" + buildTypeSpecificInstruction(topic, grade);
    }

    public String getStructuredSchema() {
        return jsonSchemaDefinition;
    }

    protected abstract String buildTypeSpecificInstruction(String topic, GradeLevel grade);

    public abstract List<QuestionGame> parseToQuestions(String rawJson);

    public abstract GameType getSupportedType();
}
    