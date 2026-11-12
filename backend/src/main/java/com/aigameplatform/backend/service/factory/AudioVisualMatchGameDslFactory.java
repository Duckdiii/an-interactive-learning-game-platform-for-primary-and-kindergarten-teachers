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

    public AudioVisualMatchGameDsl createCatalog(com.aigameplatform.backend.dto.dsl.ai.AiGameOutput output,
            GameDslRequest request) {
        if (!(output instanceof AudioVisualMatchAiOutput avm)) throw new IllegalArgumentException("AVM output required");
        var catalog = new com.aigameplatform.backend.service.media.NotoEmojiCatalog();
        var questions = new java.util.ArrayList<AudioVisualMatchQuestionDsl>();
        for (int i = 0; i < avm.questions().size(); i++) {
            var question = avm.questions().get(i);
            var correct = catalog.find(question.correct().visualPrompt()).orElseThrow();
            var distractors = question.distractors().stream().map(choice -> {
                var asset = catalog.find(choice.visualPrompt()).orElseThrow();
                return new ImageChoiceDsl(asset.label(), asset.imageUrl());
            }).toList();
            questions.add(new AudioVisualMatchQuestionDsl(Ids.numbered("q", i),
                    GameDefaults.timeLimitSeconds(GameType.AUDIO_VISUAL_MATCH, request.gradeLevel()),
                    GameDefaults.points(GameType.AUDIO_VISUAL_MATCH), question.audioText(), null, null, null,
                    new ImageChoiceDsl(correct.label(), correct.imageUrl()), distractors));
        }
        String topic = request.topic().strip();
        String title = topic.codePointCount(0, topic.length()) <= 100 ? topic
                : topic.substring(0, topic.offsetByCodePoints(0, 100)).strip();
        String limitedTopic = topic.codePointCount(0, topic.length()) <= 200 ? topic
                : topic.substring(0, topic.offsetByCodePoints(0, 200)).strip();
        return new AudioVisualMatchGameDsl(schemaVersion(), supportedType(),
                new GameMetadata(title, request.subject(), request.gradeLevel(), limitedTopic),
                new GameplaySettings(GameDefaults.hitboxScale(request.gradeLevel())), questions);
    }
}
