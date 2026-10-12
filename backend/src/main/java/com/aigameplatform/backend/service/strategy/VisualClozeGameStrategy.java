package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class VisualClozeGameStrategy extends GameContentStrategy<VisualClozeQuestionDsl, VisualClozeQuestion> {

    public VisualClozeGameStrategy(JsonMapper jsonMapper) {
        super(VisualClozeQuestionDsl.class, VisualClozeQuestion.class, jsonMapper);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, Subject subject, GradeLevel grade) {
        return "Môn: " + subjectLabel(subject) + ", " + gradeLabel(grade) + ". Chủ đề: " + topic
                + ". Mỗi câu tạo sentenceTemplate có một chỗ trống được biểu diễn bằng ___, một visualPrompt hỗ trợ suy luận, "
                + "correctAnswer và 1–3 distractors khác đáp án nhưng cùng mức độ.";
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
