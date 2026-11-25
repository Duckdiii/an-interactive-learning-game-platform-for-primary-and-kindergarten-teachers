package com.aigameplatform.backend.service.play.grading;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.service.factory.Ids;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.node.ObjectNode;

/** Quiz: id lựa chọn theo vị trí (a, b, c...), vị trí đã xáo từ lúc sinh game nên id không lộ đáp án. */
@Component
public class QuizHandler implements StudentGameHandler {

    private final PlayRecorder recorder;

    public QuizHandler(PlayRecorder recorder) {
        this.recorder = recorder;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.QUIZ;
    }

    @Override
    public void redact(RedactContext context, ObjectNode questionNode, QuestionGame question, int index) {
        questionNode.remove("correctOptionId");
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        QuizQuestion question = (QuizQuestion) c.question();
        Set<String> available = new HashSet<>();
        for (int i = 0; i < question.getOptions().size(); i++) available.add(Ids.positional(i));
        return recorder.recordSingleChoice(c, "selectedOptionId", available, Ids.positional(question.getCorrectIndex()));
    }
}
