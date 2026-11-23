package com.aigameplatform.backend.service.play.grading;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.WordScrambleQuestion;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.node.ObjectNode;

/** Word Scramble: trẻ gõ từ ghép được ({@code word}); đề chỉ giữ các chữ cái đã xáo. */
@Component
public class WordScrambleHandler implements StudentGameHandler {

    private final PlayRecorder recorder;

    public WordScrambleHandler(PlayRecorder recorder) {
        this.recorder = recorder;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.WORD_SCRAMBLE;
    }

    @Override
    public void redact(RedactContext context, ObjectNode questionNode, QuestionGame question, int index) {
        questionNode.remove("correctWord");
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        return recorder.recordTyped(c, "word", ((WordScrambleQuestion) c.question()).getCorrectWord());
    }
}
