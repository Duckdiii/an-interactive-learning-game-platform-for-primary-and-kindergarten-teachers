package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.WordScrambleGameDsl;
import com.aigameplatform.backend.dto.dsl.WordScrambleQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class WordScrambleRule extends AbstractGameRule<WordScrambleGameDsl, WordScrambleQuestionDsl> {

    public WordScrambleRule() {
        super(GameType.WORD_SCRAMBLE, WordScrambleGameDsl.class);
    }

    @Override
    protected List<WordScrambleQuestionDsl> questionsOf(WordScrambleGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(WordScrambleQuestionDsl question, String path, List<ValidationError> errors) {
        List<String> word = letters(question.correctWord());
        List<String> scrambled = question.scrambledLetters().stream().map(WordScrambleRule::letter).toList();

        if (!sorted(word).equals(sorted(scrambled))) {
            errors.add(new ValidationError(path + ".scrambledLetters",
                    "scrambledLetters phải gồm đúng các chữ cái của correctWord \"" + question.correctWord() + "\""));
            return;
        }
        boolean hasDifferentLetters = word.stream().distinct().count() > 1;
        if (hasDifferentLetters && word.equals(scrambled)) {
            errors.add(new ValidationError(path + ".scrambledLetters",
                    "scrambledLetters không được giữ nguyên thứ tự của correctWord"));
        }
    }

    private static List<String> letters(String word) {
        return normalize(word).codePoints().mapToObj(Character::toString).collect(Collectors.toList());
    }

    private static String letter(String value) {
        return normalize(value);
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFC).toUpperCase(Locale.ROOT);
    }

    private static List<String> sorted(List<String> values) {
        List<String> copy = new ArrayList<>(values);
        Collections.sort(copy);
        return copy;
    }
}
