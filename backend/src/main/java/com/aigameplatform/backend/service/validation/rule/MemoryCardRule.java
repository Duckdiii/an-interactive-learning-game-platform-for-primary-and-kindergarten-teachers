package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.MemoryCardGameDsl;
import com.aigameplatform.backend.dto.dsl.MemoryCardQuestionDsl;
import com.aigameplatform.backend.dto.dsl.MemoryPairDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MemoryCardRule extends AbstractGameRule<MemoryCardGameDsl, MemoryCardQuestionDsl> {

    public MemoryCardRule() {
        super(GameType.MEMORY_CARD, MemoryCardGameDsl.class);
    }

    @Override
    protected List<MemoryCardQuestionDsl> questionsOf(MemoryCardGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(MemoryCardQuestionDsl question, String path, List<ValidationError> errors) {
        String pairsPath = path + ".pairs";
        RuleSupport.checkUnique(question.pairs(), MemoryPairDsl::pairId, pairsPath, "pairId", errors);
        // Hai cặp có nội dung giống nhau sẽ tạo ra 4 thẻ giống hệt, trẻ không thể ghép đúng cặp.
        RuleSupport.checkUnique(question.pairs(), p -> RuleSupport.sideKey(p.content()), pairsPath, "content", errors);
    }
}
