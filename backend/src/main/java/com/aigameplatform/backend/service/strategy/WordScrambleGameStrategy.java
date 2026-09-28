package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.WordScrambleGameDsl;
import com.aigameplatform.backend.dto.dsl.WordScrambleQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.WordScrambleQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;

public class WordScrambleGameStrategy extends GameContentStrategy<WordScrambleQuestionDsl, WordScrambleQuestion> {

    public WordScrambleGameStrategy() {
        super(WordScrambleQuestionDsl.class, WordScrambleQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho WORD_SCRAMBLE");
    }

    @Override
    protected WordScrambleQuestion toEntity(WordScrambleQuestionDsl dsl) {
        WordScrambleQuestion question = new WordScrambleQuestion();
        question.setCorrectWord(dsl.correctWord());
        question.setScrambledLetters(new ArrayList<>(dsl.scrambledLetters()));
        return question;
    }

    @Override
    protected WordScrambleQuestionDsl toDsl(WordScrambleQuestion entity, String questionId) {
        return new WordScrambleQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(),
                entity.getAudioText(), entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                entity.getCorrectWord(), List.copyOf(entity.getScrambledLetters()));
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<WordScrambleQuestionDsl> questions) {
        return new WordScrambleGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.WORD_SCRAMBLE, metadata,
                settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.WORD_SCRAMBLE;
    }
}
