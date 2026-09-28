package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class QuizGameDslFactory
        extends AbstractGameDslFactory<QuizAiOutput, QuizAiQuestion, QuizQuestionDsl, QuizGameDsl> {

    public QuizGameDslFactory(RandomGenerator random) {
        super(GameType.QUIZ, QuizAiOutput.class, random);
    }

    @Override
    protected List<QuizAiQuestion> aiQuestionsOf(QuizAiOutput output) {
        return output.questions();
    }

    @Override
    protected QuizQuestionDsl createQuestion(QuizAiQuestion ai, QuestionBase base) {
        // AI hay đặt đáp án đúng ở đầu, nên xáo rồi tính lại id của đáp án đúng.
        List<Integer> order = ShuffleSupport.shuffledIndices(ai.options().size(), random);
        List<TextChoiceDsl> options = new ArrayList<>();
        String correctOptionId = null;
        for (int position = 0; position < order.size(); position++) {
            int original = order.get(position);
            String id = Ids.positional(position);
            options.add(new TextChoiceDsl(id, ai.options().get(original)));
            if (original == ai.correctIndex()) {
                correctOptionId = id;
            }
        }
        return new QuizQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                ai.visualPrompt(), null, ai.text(), options, correctOptionId);
    }

    @Override
    protected QuizGameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<QuizQuestionDsl> questions) {
        return new QuizGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
