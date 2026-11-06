package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Deterministically checks explicit integer arithmetic questions; it does not infer answers from prose or images. */
public final class QuizArithmeticAnswerVerifier {
    private static final Pattern EXPRESSION = Pattern.compile(
            "(?i)(?<![\\p{L}\\p{N}])(-?\\d{1,6})\\s*(\\+|−|×|\\*|/|÷|-|x|cộng|trừ|nhân|chia)\\s*(-?\\d{1,6})(?![\\p{L}\\p{N}])");
    private static final Pattern CHAINED_OPERATION = Pattern.compile(
            "(?i)^\\s*(?:\\+|−|×|\\*|/|÷|-|x|cộng|trừ|nhân|chia)\\s*-?\\d{1,6}(?![\\p{L}\\p{N}])");
    private static final Pattern INTEGER = Pattern.compile("^\\s*(-?\\d+)\\s*[.!?]?\\s*$");

    private QuizArithmeticAnswerVerifier() { }

    static void check(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        TextChoiceDsl correct = question.options().stream()
                .filter(option -> option.id().equals(question.correctOptionId())).findFirst().orElse(null);
        check(question.questionText(), question.options().stream().map(TextChoiceDsl::text).toList(),
                correct == null ? null : correct.text(),
                path + ".questionText", path + ".options", path + ".correctOptionId", errors);
    }

    /**
     * Phần dùng chung (Quiz DSL và màn PICK_ONE của CPF): nếu câu có đúng một phép tính số nguyên tường minh thì
     * đúng một lựa chọn phải bằng kết quả và đó phải là lựa chọn được đánh dấu đúng. Không có phép tính thì bỏ qua.
     */
    public static void check(String questionText, List<String> optionTexts, String correctText,
            String questionPath, String optionsPath, String correctPath, List<ValidationError> errors) {
        Matcher matcher = EXPRESSION.matcher(questionText);
        if (!matcher.find()) return;
        String leftText = matcher.group(1);
        String operatorText = matcher.group(2);
        String rightText = matcher.group(3);
        String remainder = questionText.substring(matcher.end());
        if (CHAINED_OPERATION.matcher(remainder).find() || matcher.find()) {
            errors.add(new ValidationError(questionPath,
                    "Câu hỏi có nhiều phép tính; không thể xác định một đáp án duy nhất để kiểm tra tự động"));
            return;
        }

        long left = Long.parseLong(leftText);
        String operator = operatorText.toLowerCase(java.util.Locale.ROOT);
        long right = Long.parseLong(rightText);
        Long expected = calculate(left, operator, right);
        if (expected == null) {
            errors.add(new ValidationError(questionPath,
                    "Phép tính trong câu hỏi không cho kết quả nguyên xác định để kiểm tra tự động"));
            return;
        }

        long matchingOptions = optionTexts.stream()
                .map(QuizArithmeticAnswerVerifier::numericValue)
                .filter(value -> value != null && value == expected)
                .count();
        if (matchingOptions != 1) {
            errors.add(new ValidationError(optionsPath,
                    "A direct arithmetic question must have exactly one option matching the computed answer"));
        }
        Long selectedValue = numericValue(correctText);
        if (selectedValue == null || selectedValue != expected) {
            errors.add(new ValidationError(correctPath,
                    "Đáp án được chọn không khớp kết quả phép tính hiển thị trong câu hỏi (" + expected + ")"));
        }
    }

    private static Long numericValue(String text) {
        Matcher answer = text == null ? null : INTEGER.matcher(text);
        if (answer == null || !answer.matches()) return null;
        try { return Long.parseLong(answer.group(1)); }
        catch (NumberFormatException ignored) { return null; }
    }

    private static Long calculate(long left, String operator, long right) {
        try {
            return switch (operator) {
                case "+", "cộng" -> Math.addExact(left, right);
                case "−", "-", "trừ" -> Math.subtractExact(left, right);
                case "×", "*", "nhân", "x" -> Math.multiplyExact(left, right);
                case "/", "÷", "chia" -> right != 0 && left % right == 0 ? left / right : null;
                default -> null;
            };
        } catch (ArithmeticException overflow) {
            return null;
        }
    }
}
