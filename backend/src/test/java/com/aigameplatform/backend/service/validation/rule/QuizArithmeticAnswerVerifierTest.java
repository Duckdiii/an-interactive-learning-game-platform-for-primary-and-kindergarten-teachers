package com.aigameplatform.backend.service.validation.rule;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

/** Các nhánh mà PIT báo chưa có test bắt được (docs/harness-evals/D-pit-baseline.md, KNOWN-GAPS #25). */
class QuizArithmeticAnswerVerifierTest {

    private static List<String> check(String question, List<String> options, String correct) {
        List<ValidationError> errors = new ArrayList<>();
        QuizArithmeticAnswerVerifier.check(question, options, correct, "q", "options", "correct", errors);
        return errors.stream().map(ValidationError::path).toList();
    }

    private static List<String> checkTarget(String question, List<String> labels, String correct) {
        List<ValidationError> errors = new ArrayList<>();
        QuizArithmeticAnswerVerifier.checkTarget(question, labels, correct, "options", "correct", errors);
        return errors.stream().map(ValidationError::path).toList();
    }

    @ParameterizedTest
    @ValueSource(strings = {"12 ÷ 3 = ?", "12 / 3 = ?", "12 chia 3 bằng mấy?"})
    void divisionWithAWholeResultAcceptsTheQuotient(String question) {
        assertThat(check(question, List.of("4", "36", "9"), "4")).isEmpty();
    }

    @Test
    void divisionRejectsAWrongMarkedAnswer() {
        assertThat(check("12 ÷ 3 = ?", List.of("4", "36", "9"), "36")).containsExactly("correct");
    }

    @ParameterizedTest
    @ValueSource(strings = {"7 ÷ 2 = ?", "5 ÷ 0 = ?"})
    void divisionWithoutAWholeResultCannotBeCheckedAutomatically(String question) {
        assertThat(check(question, List.of("3", "4"), "3")).containsExactly("q");
    }

    @Test
    void nonNumericOptionsAreNotCountedAsTheAnswer() {
        assertThat(check("3 − 3 = ?", List.of("0", "bằng không", "99999999999999999999"), "0")).isEmpty();
    }

    @Test
    void targetFormIsSkippedWhenALabelIsMissing() {
        assertThat(checkTarget("Phép tính nào bằng 0?", Arrays.asList("3 − 3", null), "3 − 3")).isEmpty();
    }

    @Test
    void targetFormAcceptsDivisionLabels() {
        assertThat(checkTarget("Phép tính nào bằng 4?", List.of("12 ÷ 3", "12 × 3"), "12 ÷ 3")).isEmpty();
        assertThat(checkTarget("Phép tính nào bằng 4?", List.of("12 ÷ 3", "12 × 3"), "12 × 3")).containsExactly("correct");
    }
}
