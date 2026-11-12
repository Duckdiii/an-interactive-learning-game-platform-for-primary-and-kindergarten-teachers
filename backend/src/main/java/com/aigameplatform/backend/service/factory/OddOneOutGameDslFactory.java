package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class OddOneOutGameDslFactory extends
        AbstractGameDslFactory<OddOneOutAiOutput, OddOneOutAiQuestion, OddOneOutQuestionDsl, OddOneOutGameDsl> {

    public OddOneOutGameDslFactory(RandomGenerator random) {
        super(GameType.ODD_ONE_OUT, OddOneOutAiOutput.class, random);
    }

    @Override
    protected List<OddOneOutAiQuestion> aiQuestionsOf(OddOneOutAiOutput output) {
        return output.questions();
    }

    @Override
    protected OddOneOutQuestionDsl createQuestion(OddOneOutAiQuestion ai, QuestionBase base) {
        List<Integer> order = ShuffleSupport.shuffledIndices(ai.items().size(), random);
        List<TextChoiceDsl> items = new ArrayList<>();
        String oddOneOutId = null;
        for (int position = 0; position < order.size(); position++) {
            int original = order.get(position);
            String id = Ids.positional(position);
            items.add(new TextChoiceDsl(id, ai.items().get(original)));
            if (original == ai.oddOneOutIndex()) {
                oddOneOutId = id;
            }
        }
        return new OddOneOutQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                null, null, items, oddOneOutId);
    }

    @Override
    protected OddOneOutGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<OddOneOutQuestionDsl> questions) {
        return new OddOneOutGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }

    public OddOneOutGameDsl createImage(com.aigameplatform.backend.dto.dsl.ai.AiGameOutput output,
            GameDslRequest request) {
        if (!(output instanceof OddOneOutAiOutput odd)) throw new IllegalArgumentException("Odd IMAGE output required");
        var catalog = new com.aigameplatform.backend.service.media.NotoEmojiCatalog();
        var questions = new ArrayList<OddOneOutQuestionDsl>();
        for (int number = 0; number < odd.questions().size(); number++) {
            var source = odd.questions().get(number);
            var order = ShuffleSupport.shuffledIndices(source.items().size(), random);
            var items = new ArrayList<TextChoiceDsl>();
            String oddId = null;
            for (int pos = 0; pos < order.size(); pos++) {
                int original = order.get(pos);
                var asset = catalog.find(source.items().get(original))
                        .orElseThrow(() -> new IllegalArgumentException("Unknown catalog asset"));
                String id = Ids.positional(pos);
                items.add(new TextChoiceDsl(id, asset.label(), asset.id(), asset.imageUrl()));
                if (original == source.oddOneOutIndex()) oddId = id;
            }
            questions.add(new OddOneOutQuestionDsl(Ids.numbered("q", number),
                    GameDefaults.timeLimitSeconds(GameType.ODD_ONE_OUT, request.gradeLevel()),
                    GameDefaults.points(GameType.ODD_ONE_OUT), source.audioText(), null, null, null,
                    items, oddId, source.questionText()));
        }
        String topic = request.topic().strip();
        String title = topic.codePointCount(0, topic.length()) <= 100 ? topic
                : topic.substring(0, topic.offsetByCodePoints(0, 100)).strip();
        String limitedTopic = topic.codePointCount(0, topic.length()) <= 200 ? topic
                : topic.substring(0, topic.offsetByCodePoints(0, 200)).strip();
        return new OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT,
                com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE,
                new GameMetadata(title, request.subject(), request.gradeLevel(), limitedTopic),
                new GameplaySettings(GameDefaults.hitboxScale(request.gradeLevel())), questions);
    }
}
