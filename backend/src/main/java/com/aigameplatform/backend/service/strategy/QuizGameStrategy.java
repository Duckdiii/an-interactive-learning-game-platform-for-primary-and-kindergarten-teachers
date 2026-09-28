package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.service.factory.Ids;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class QuizGameStrategy extends GameContentStrategy<QuizQuestionDsl, QuizQuestion> {

    public QuizGameStrategy() {
        super(QuizQuestionDsl.class, QuizQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho QUIZ");
    }

    @Override
    protected QuizQuestion toEntity(QuizQuestionDsl dsl) {
        QuizQuestion question = new QuizQuestion();
        question.setText(dsl.questionText());
        question.setOptions(new ArrayList<>(ChoiceMapping.texts(dsl.options())));
        question.setCorrectIndex(ChoiceMapping.indexOfId(dsl.options(), dsl.correctOptionId()));
        return question;
    }

    @Override
    protected QuizQuestionDsl toDsl(QuizQuestion entity, String questionId) {
        return new QuizQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), entity.getText(),
                ChoiceMapping.withPositionalIds(entity.getOptions()), Ids.positional(entity.getCorrectIndex()));
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<QuizQuestionDsl> questions) {
        return new QuizGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.QUIZ, metadata, settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.QUIZ;
    }
}
