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
 * - Dynamically binds standard K-5 SVG asset sprites based on visualPrompt and learning keywords
 * - Ensures students receive visual sprites in the DSL
 * - Binds audioUrl when audioText is present
 */
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

        // Chặng 2.5: Gắn tài nguyên hình ảnh trực quan và âm thanh giọng đọc
        String imageUrl = resolveImageUrl(ai.visualPrompt(), ai.text());
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
     * Chặng 2.5 (Asset Dressing): Ánh xạ từ khóa học liệu sang đường dẫn SVG sprite chuẩn K-5.
     */
    static String resolveImageUrl(String visualPrompt, String questionText) {
        if ((visualPrompt == null || visualPrompt.isBlank()) && (questionText == null || questionText.isBlank())) {
            return null;
        }

        String combined = ((visualPrompt != null ? visualPrompt : "") + " " + (questionText != null ? questionText : "")).toLowerCase();

        // Mèo
        if (combined.contains("cat") || combined.contains("mèo") || combined.contains("meo")) {
            return "/assets/animals/cat.svg";
        }
        // Chó
        if (combined.contains("dog") || combined.contains("chó") || combined.contains("cún") || combined.contains("cho") || combined.contains("cun")) {
            return "/assets/animals/dog.svg";
        }
        // Táo
        if (combined.contains("apple") || combined.contains("táo") || combined.contains("tao")) {
            return "/assets/fruits/apple.svg";
        }
        // Chuối
        if (combined.contains("banana") || combined.contains("chuối") || combined.contains("chuoi")) {
            return "/assets/fruits/banana.svg";
        }
        // Cam
        if (combined.contains("orange") || combined.contains("cam")) {
            return "/assets/fruits/orange.svg";
        }
        // Dâu tây
        if (combined.contains("strawberry") || combined.contains("dâu") || combined.contains("dau")) {
            return "/assets/fruits/strawberry.svg";
        }
        // Dưa hấu
        if (combined.contains("watermelon") || combined.contains("dưa") || combined.contains("dua")) {
            return "/assets/fruits/watermelon.svg";
        }
        // Gà / Chim
        if (combined.contains("chicken") || combined.contains("bird") || combined.contains("gà") || combined.contains("chim")) {
            return "/assets/animals/bird.svg";
        }
        // Vịt
        if (combined.contains("duck") || combined.contains("vịt") || combined.contains("vit")) {
            return "/assets/animals/duck.svg";
        }
        // Cá (tránh match 'cat')
        if (combined.contains("fish") || combined.contains("cá") || combined.matches(".*\\bca\\b.*")) {
            return "/assets/animals/fish.svg";
        }
        // Thỏ
        if (combined.contains("rabbit") || combined.contains("thỏ") || combined.contains("tho")) {
            return "/assets/animals/rabbit.svg";
        }
        // Đồ vật K-5
        if (combined.contains("candy") || combined.contains("kẹo") || combined.contains("keo")) {
            return "/assets/objects/candy.svg";
        }
        if (combined.contains("flower") || combined.contains("hoa")) {
            return "/assets/objects/flower.svg";
        }
        if (combined.contains("ball") || combined.contains("bóng") || combined.contains("bong")) {
            return "/assets/objects/ball.svg";
        }
        if (combined.contains("car") || combined.contains("xe") || combined.contains("ô tô")) {
            return "/assets/objects/car.svg";
        }
        if (combined.contains("heart") || combined.contains("tim")) {
            return "/assets/objects/heart.svg";
        }

        // Nếu visualPrompt có nội dung bất kỳ -> gán ngôi sao K-5 mặc định
        if (visualPrompt != null && !visualPrompt.isBlank()) {
            return "/assets/objects/star.svg";
        }

        return null;
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
