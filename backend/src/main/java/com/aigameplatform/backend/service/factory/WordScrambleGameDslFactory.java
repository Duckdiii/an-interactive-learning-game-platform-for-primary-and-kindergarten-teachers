package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.WordScrambleGameDsl;
import com.aigameplatform.backend.dto.dsl.WordScrambleQuestionDsl;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.text.Normalizer;
import java.util.List;
import java.util.random.RandomGenerator;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class WordScrambleGameDslFactory extends AbstractGameDslFactory<WordScrambleAiOutput,
        WordScrambleAiQuestion, WordScrambleQuestionDsl, WordScrambleGameDsl> {

    public WordScrambleGameDslFactory(RandomGenerator random) {
        super(GameType.WORD_SCRAMBLE, WordScrambleAiOutput.class, random);
    }

    @Override
    protected List<WordScrambleAiQuestion> aiQuestionsOf(WordScrambleAiOutput output) {
        return output.questions();
    }

    @Override
    protected WordScrambleQuestionDsl createQuestion(WordScrambleAiQuestion ai, QuestionBase base) {
        // NFC để mỗi chữ cái có dấu là một phần tử; AI không tự xáo chữ vì dễ sai.
        String word = Normalizer.normalize(ai.correctWord(), Normalizer.Form.NFC);
        List<String> letters = word.codePoints().mapToObj(Character::toString).collect(Collectors.toList());
        return new WordScrambleQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                ai.visualPrompt(), null, word, ShuffleSupport.shuffledValuesNotEqual(letters, random));
    }

    @Override
    protected WordScrambleGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<WordScrambleQuestionDsl> questions) {
        return new WordScrambleGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
