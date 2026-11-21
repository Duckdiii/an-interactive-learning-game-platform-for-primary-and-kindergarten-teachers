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

/**
 * QuizGameDslFactory: Assembles validated QuizGameDsl from AI output.
 * Stage 2.5 Dressing Integration:
 * - imageUrl từ hình AI chọn trong danh mục (trường asset), không đoán theo từ khóa
 * - Ensures students receive visual sprites in the DSL
 * - Binds audioUrl when audioText is present
 */
@Component
public class QuizGameDslFactory
        extends AbstractGameDslFactory<QuizAiOutput, QuizAiQuestion, QuizQuestionDsl, QuizGameDsl> {

    public QuizGameDslFactory(RandomGenerator random, GameAssetCatalog assets) {
        super(GameType.QUIZ, QuizAiOutput.class, random, assets);
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

        // Chặng 2.5: Gắn tài nguyên hình ảnh trực quan và âm thanh giọng đọc
        String imageUrl = imageOf(ai.asset());
        String audioUrl = resolveAudioUrl(ai.audioText());

        return new QuizQuestionDsl(
                base.id(),
                base.timeLimitSeconds(),
                base.points(),
                ai.audioText(),
                audioUrl,
                ai.visualPrompt(),
                imageUrl,
                ai.text(),
                options,
                correctOptionId);
    }

    @Override
    protected QuizGameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<QuizQuestionDsl> questions) {
        return new QuizGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }

    /**
     * Chặng 2.5: Ánh xạ âm thanh giọng đọc nếu đề bài có audioText.
     */
    static String resolveAudioUrl(String audioText) {
        if (audioText != null && !audioText.isBlank()) {
            return "/mock/q1.wav";
        }
        return null;
    }
}
