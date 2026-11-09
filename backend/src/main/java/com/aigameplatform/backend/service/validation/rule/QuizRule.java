package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class QuizRule extends AbstractGameRule<QuizGameDsl, QuizQuestionDsl> {

    public QuizRule() {
        super(GameType.QUIZ, QuizGameDsl.class);
    }

    @Override
    protected List<QuizQuestionDsl> questionsOf(QuizGameDsl game) {
        return game.questions();
    }

    /** Chỗ trống của câu điền khuyết kèm phần chữ dính hai bên ("th..." cho "th" và ""). */
    private static final Pattern FILL_IN_BLANK = Pattern.compile("(\\p{L}*)(?:\\.{3}|…|_{2,})(\\p{L}*)");
    /** Đoạn trong một cặp ngoặc cùng loại. */
    private static final Pattern QUOTED = Pattern.compile("'([^']+)'|\"([^\"]+)\"|‘([^’]+)’|“([^”]+)”");

    @Override
    protected void checkQuestion(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        String optionsPath = path + ".options";
        RuleSupport.checkPositionalIds(question.options(), TextChoiceDsl::id, optionsPath, errors);
        RuleSupport.checkUnique(question.options(), o -> RuleSupport.normalize(o.text()), optionsPath, "text", errors);

        boolean correctExists = question.options().stream().anyMatch(o -> o.id().equals(question.correctOptionId()));
        if (!correctExists) {
            errors.add(new ValidationError(path + ".correctOptionId",
                    "correctOptionId \"" + question.correctOptionId() + "\" không thuộc danh sách options; "
                            + "phải là id của đúng một đáp án"));
        } else {
            QuizArithmeticAnswerVerifier.check(question, path, errors);
            checkAnswerNotRevealed(question, path, errors);
        }
    }

    /**
     * Câu điền khuyết mà lời dẫn đã ghi sẵn từ hoàn chỉnh chứa đáp án ("th... gỗ (để có từ 'than gỗ')") thì trẻ đọc là
     * chọn được (lỗi thật ở kịch bản 003). Chỉ xét câu có chỗ trống để không chặn nhầm câu hỏi "Tiếng 'than' có vần gì?".
     */
    private static void checkAnswerNotRevealed(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        String text = RuleSupport.normalize(question.questionText());
        String answer = correctText(question);
        if (answer.isEmpty()) return;
        // Ghép đáp án vào chỗ trống ("th..." + "an" = "than") rồi tìm đúng từ đó trong đoạn trích không có chỗ trống.
        List<String> completed = FILL_IN_BLANK.matcher(text).results()
                .map(blank -> blank.group(1) + answer + blank.group(2)).toList();
        if (completed.isEmpty()) return;
        var quoted = QUOTED.matcher(text);
        while (quoted.find()) {
            String segment = java.util.stream.IntStream.rangeClosed(1, 4).mapToObj(quoted::group)
                    .filter(java.util.Objects::nonNull).findFirst().orElse("");
            if (FILL_IN_BLANK.matcher(segment).find()) continue;
            for (String word : completed) {
                if (Pattern.compile("(?<!\\p{L})" + Pattern.quote(word) + "(?!\\p{L})").matcher(segment).find()) {
                    errors.add(new ValidationError(path + ".questionText",
                            "Lời dẫn đã ghi sẵn từ hoàn chỉnh \"" + word + "\"; bỏ phần gợi ý này khỏi câu hỏi"));
                    return;
                }
            }
        }
    }

    /** Không lặp câu (cùng lời dẫn và cùng đáp án), và không để mọi câu cùng một đáp án (từ 3 câu trở lên). */
    @Override
    protected void checkAcrossQuestions(List<QuizQuestionDsl> questions, List<ValidationError> errors) {
        RuleSupport.checkUnique(questions, q -> RuleSupport.normalize(q.questionText()) + " => " + correctText(q),
                "$.questions", "questionText", errors);
        long distinctOptions = questions.stream().flatMap(q -> q.options().stream())
                .map(o -> RuleSupport.normalize(o.text())).distinct().count();
        if (RuleSupport.sameAnswerEverywhere(questions.stream().map(QuizRule::correctText).toList(), distinctOptions)) {
            errors.add(new ValidationError("$.questions", "Mọi câu đều có cùng đáp án \""
                    + correctText(questions.getFirst()) + "\"; đổi đáp án đúng giữa các câu"));
        }
    }

    private static String correctText(QuizQuestionDsl question) {
        return question.options().stream().filter(o -> o.id().equals(question.correctOptionId()))
                .map(o -> RuleSupport.normalize(o.text())).findFirst().orElse("");
    }
}
