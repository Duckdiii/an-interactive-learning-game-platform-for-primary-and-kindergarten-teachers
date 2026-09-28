package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.MatchingGameDsl;
import com.aigameplatform.backend.dto.dsl.MatchingPairDsl;
import com.aigameplatform.backend.dto.dsl.MatchingQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MatchingRule extends AbstractGameRule<MatchingGameDsl, MatchingQuestionDsl> {

    public MatchingRule() {
        super(GameType.MATCHING, MatchingGameDsl.class);
    }

    @Override
    protected List<MatchingQuestionDsl> questionsOf(MatchingGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(MatchingQuestionDsl question, String path, List<ValidationError> errors) {
        String pairsPath = path + ".pairs";
        List<MatchingPairDsl> pairs = question.pairs();
        RuleSupport.checkUnique(pairs, MatchingPairDsl::pairId, pairsPath, "pairId", errors);
        // Mỗi bên không có hai phần tử giống nhau thì quan hệ nối mới là 1-1.
        RuleSupport.checkUnique(pairs, p -> RuleSupport.sideKey(p.left()), pairsPath, "left", errors);
        RuleSupport.checkUnique(pairs, p -> RuleSupport.sideKey(p.right()), pairsPath, "right", errors);
    }
}
