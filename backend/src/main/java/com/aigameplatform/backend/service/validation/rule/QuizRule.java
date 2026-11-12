package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    /** Hình thẻ số (numbers/number-N.svg), N là đáp án. */
    private static final Pattern NUMBER_CARD = Pattern.compile("/numbers/number-(\\d+)\\.svg$");
    /** Mô tả hình nói về chính con số ("chữ số 3", "Số 3"), không phải vật cần đếm. "số lượng" thì không tính. */
    private static final Pattern ABOUT_A_NUMBER = Pattern.compile("(?<!\\p{L})(chữ số|thẻ số|con số|số\\s+\\d)");
    private static final Map<String, Integer> NUMBER_WORDS = Map.of("một", 1, "hai", 2, "ba", 3, "bốn", 4, "năm", 5,
            "sáu", 6, "bảy", 7, "tám", 8, "chín", 9, "mười", 10);
    /** Mô tả hình bắt đầu bằng số lượng vật: "3 con vịt", "Hai con vịt". */
    private static final Pattern COUNT_AT_START = Pattern.compile("^(\\d{1,2}|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\\s+\\p{L}+");
    private static final Pattern COUNTING_QUESTION = Pattern.compile("bao nhiêu|mấy|đếm");
    /** Câu có phép thêm/bớt/so sánh: số trong hình không nhất thiết là đáp án. */
    private static final Pattern NOT_A_PLAIN_COUNT = Pattern.compile("thêm|bớt|còn lại|hơn|kém|cộng|trừ");
    /** Cách đọc thành lời của dấu so sánh, để bắt lời đọc "3 nhỏ hơn 8" cho đáp án "<". */
    private static final Map<String, List<String>> SPOKEN = Map.of(
            "<", List.of("<", "nhỏ hơn", "bé hơn"), ">", List.of(">", "lớn hơn"), "=", List.of("=", "bằng"));

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
            checkAudioDoesNotSayTheAnswer(question, path, errors);
            checkIllustrationIsNotTheAnswer(question, path, errors);
            checkCountMatchesTheAnswer(question, path, errors);
        }
    }

    /**
     * Câu đếm ("3 con vịt") mà hình minh họa lại là thẻ số đúng bằng đáp án: lộ đáp án và không có vật nào để đếm (lỗi thật ở
     * kịch bản 001, thử nghiệm lần 4). Không chặn câu nhận biết chữ số, khi mô tả hình nói về con số ("chữ số 3", "Số 3").
     * "Số lượng 3 con vịt" vẫn là câu đếm nên không được miễn.
     */
    private static void checkIllustrationIsNotTheAnswer(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        if (question.imageUrl() == null) return;
        var card = NUMBER_CARD.matcher(question.imageUrl());
        if (!card.find() || !card.group(1).equals(correctText(question))) return;
        String prompt = question.visualPrompt() == null ? "" : question.visualPrompt().toLowerCase(Locale.ROOT);
        if (ABOUT_A_NUMBER.matcher(prompt).find()) return;
        errors.add(new ValidationError(path + ".imageUrl", "Hình minh họa là thẻ số " + card.group(1) + " (asset num-"
                + card.group(1) + ") trùng đáp án trong khi mô tả là vật cần đếm; đổi asset sang hình vật được đếm"
                + " (ví dụ con vịt) hoặc bỏ trường asset"));
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

    /**
     * Câu có chỗ trống mà lời đọc lại nói ra đáp án ("Bé chọn dấu thích hợp: 3 nhỏ hơn 8" cho "3 ... 8"): trẻ bấm "Nghe lại"
     * là biết đáp án (lỗi thật ở kịch bản 002, thử nghiệm lần 3). Chỉ xét câu có chỗ trống, chỉ khi câu hỏi không chứa chữ đó, và
     * bỏ qua lời đọc nhắc từ hai lựa chọn trở lên (đang đọc các lựa chọn: "Chọn dấu lớn hơn, bé hơn hay bằng").
     * Giới hạn đã biết: chưa bắt được đáp án đọc bằng chữ khác cách viết ("ba" cho "3") và chỗ trống dạng "?".
     */
    private static void checkAudioDoesNotSayTheAnswer(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        if (question.audioText() == null) return;
        String text = RuleSupport.normalize(question.questionText());
        String audio = RuleSupport.normalize(question.audioText());
        String answer = correctText(question);
        if (answer.isEmpty() || !FILL_IN_BLANK.matcher(text).find()) return;
        long optionsHeard = question.options().stream()
                .filter(o -> spokenForms(RuleSupport.normalize(o.text())).stream().anyMatch(s -> says(audio, s))).count();
        if (optionsHeard > 1) return;
        for (String spoken : spokenForms(answer)) {
            if (says(audio, spoken) && !says(text, spoken)) {
                errors.add(new ValidationError(path + ".audioText", "Lời đọc nói ra đáp án \"" + spoken
                        + "\" trong khi câu hỏi để trống; chỉ đọc lại câu hỏi (chỗ trống đọc là \"chỗ trống\") hoặc bỏ audioText"));
                return;
            }
        }
    }

    /**
     * Câu đếm ("Có bao nhiêu con vịt?") mà mô tả hình nói 2 con còn đáp án là 3: hình và đáp án mâu thuẫn, trẻ đếm đúng vẫn bị
     * tính sai (lỗi thật ở kịch bản 001, thử nghiệm lần 5). Chỉ xét câu đếm thuần, bỏ qua câu có thêm/bớt/so sánh.
     */
    private static void checkCountMatchesTheAnswer(QuizQuestionDsl question, String path, List<ValidationError> errors) {
        if (question.visualPrompt() == null || question.questionText() == null) return;
        String text = question.questionText().toLowerCase(Locale.ROOT);
        if (!COUNTING_QUESTION.matcher(text).find() || NOT_A_PLAIN_COUNT.matcher(text).find()) return;
        var count = COUNT_AT_START.matcher(question.visualPrompt().toLowerCase(Locale.ROOT).strip());
        String answer = correctText(question);
        if (!count.find() || !answer.matches("\\d+")) return;
        String said = count.group(1);
        int shown = said.chars().allMatch(Character::isDigit) ? Integer.parseInt(said) : NUMBER_WORDS.get(said);
        if (shown != Integer.parseInt(answer)) {
            errors.add(new ValidationError(path + ".correctOptionId", "Mô tả hình nói " + shown + " nhưng đáp án đúng là " + answer
                    + "; sửa đáp án hoặc mô tả hình cho khớp số lượng"));
        }
    }

    private static List<String> spokenForms(String option) {
        return SPOKEN.getOrDefault(option, List.of(option));
    }

    /** Có nói ra {@code spoken} không: ký hiệu (dấu so sánh) tìm cả khi viết liền số ("3<8"), chữ thì phải là nguyên từ. */
    private static boolean says(String text, String spoken) {
        if (!spoken.chars().anyMatch(Character::isLetterOrDigit)) return text.contains(spoken);
        return Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(spoken) + "(?![\\p{L}\\p{N}])").matcher(text).find();
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
