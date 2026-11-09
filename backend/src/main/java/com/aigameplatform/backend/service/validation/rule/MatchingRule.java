package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.MatchingGameDsl;
import com.aigameplatform.backend.dto.dsl.MatchingPairDsl;
import com.aigameplatform.backend.dto.dsl.MatchingQuestionDsl;
import com.aigameplatform.backend.dto.dsl.PairSideDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.text.Normalizer;
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
        // Hai vế cùng một chữ ("head" ↔ "Head") thì trẻ nối theo mặt chữ, không học được gì (lỗi thật ở kịch bản 004).
        for (int i = 0; i < pairs.size(); i++) {
            MatchingPairDsl pair = pairs.get(i);
            if (hasText(pair.left()) && hasText(pair.right()) && sameWord(pair.left().text(), pair.right().text())) {
                errors.add(new ValidationError(RuleSupport.elementPath(pairsPath, i, "right"),
                        "Hai vế của cặp giống nhau; vế phải phải là nghĩa, hình hoặc cách biểu diễn khác của vế trái"));
            }
        }
    }

    /** Cùng chữ, không tính hoa/thường; riêng một chữ cái thì "A" ↔ "a" là hai dạng khác nhau (bài chữ hoa/chữ thường). */
    private static boolean sameWord(String left, String right) {
        String a = Normalizer.normalize(left.strip(), Normalizer.Form.NFC);
        String b = Normalizer.normalize(right.strip(), Normalizer.Form.NFC);
        return a.equals(b) || (a.codePointCount(0, a.length()) > 1 && RuleSupport.normalize(a).equals(RuleSupport.normalize(b)));
    }

    private static boolean hasText(PairSideDsl side) {
        return side != null && side.text() != null && !side.text().isBlank();
    }
}
