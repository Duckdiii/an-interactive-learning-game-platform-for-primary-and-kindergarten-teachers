package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.ImageChoiceDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiImage;
import com.aigameplatform.backend.dto.dsl.ai.AudioVisualMatchAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.AudioVisualMatchAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class AudioVisualMatchGameDslFactory extends AbstractGameDslFactory<AudioVisualMatchAiOutput,
        AudioVisualMatchAiQuestion, AudioVisualMatchQuestionDsl, AudioVisualMatchGameDsl> {

    public AudioVisualMatchGameDslFactory(RandomGenerator random) {
        super(GameType.AUDIO_VISUAL_MATCH, AudioVisualMatchAiOutput.class, random);
    }

    @Override
    protected List<AudioVisualMatchAiQuestion> aiQuestionsOf(AudioVisualMatchAiOutput output) {
        return output.questions();
    }

    @Override
    protected AudioVisualMatchQuestionDsl createQuestion(AudioVisualMatchAiQuestion ai, QuestionBase base) {
        // Hình đúng và hình nhiễu lưu riêng; việc trộn thứ tự hiển thị là của bản dành cho học sinh.
        return new AudioVisualMatchQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(),
                null, null, null, image(ai.correct()), ai.distractors().stream().map(AudioVisualMatchGameDslFactory::image).toList());
    }

    @Override
    protected AudioVisualMatchGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<AudioVisualMatchQuestionDsl> questions) {
        return new AudioVisualMatchGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }

    private static ImageChoiceDsl image(AiImage ai) {
        return new ImageChoiceDsl(ai.visualPrompt(), null);
    }
}
