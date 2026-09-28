package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.ArrayList;
import java.util.List;

/**
 * Luật nghiệp vụ (Layer 2) của một loại game. Mỗi loại game một lớp con, để thêm loại mới chỉ cần thêm
 * lớp mới. Luật chung cho mọi loại (id câu hỏi không trùng) nằm ở đây.
 *
 * @param <G> record game của loại game này
 * @param <Q> record câu hỏi của loại game này
 */
public abstract class AbstractGameRule<G extends GameDsl, Q extends QuestionDsl> {

    private final GameType supportedType;
    private final Class<G> gameClass;

    protected AbstractGameRule(GameType supportedType, Class<G> gameClass) {
        this.supportedType = supportedType;
        this.gameClass = gameClass;
    }

    public GameType supportedType() {
        return supportedType;
    }

    public final List<ValidationError> check(GameDsl game) {
        List<Q> questions = questionsOf(gameClass.cast(game));
        List<ValidationError> errors = new ArrayList<>();
        RuleSupport.checkUnique(questions, Q::id, "$.questions", "id", errors);
        for (int i = 0; i < questions.size(); i++) {
            checkQuestion(questions.get(i), "$.questions[" + i + "]", errors);
        }
        return errors;
    }

    protected abstract List<Q> questionsOf(G game);

    /** Kiểm tra một màn chơi; {@code path} là vị trí của màn đó, ví dụ {@code $.questions[0]}. */
    protected abstract void checkQuestion(Q question, String path, List<ValidationError> errors);
}
