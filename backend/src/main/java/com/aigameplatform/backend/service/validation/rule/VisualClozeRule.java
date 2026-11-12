package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class VisualClozeRule extends AbstractGameRule<VisualClozeGameDsl, VisualClozeQuestionDsl> {

    private static final String BLANK = "___";
    private static final Pattern UNDERSCORE_RUN = Pattern.compile("_{3,}");

    public VisualClozeRule() {
        super(GameType.VISUAL_CLOZE, VisualClozeGameDsl.class);
    }

    @Override
    protected List<VisualClozeQuestionDsl> questionsOf(VisualClozeGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(VisualClozeQuestionDsl question, String path, List<ValidationError> errors) {
        checkSingleBlank(question.sentenceTemplate(), path + ".sentenceTemplate", errors);

        // Đáp án đúng và các từ nhiễu phải khác nhau, nếu không sẽ có hai đáp án đúng.
        List<String> all = new ArrayList<>();
        all.add(question.correctAnswer());
        all.addAll(question.distractors());
        RuleSupport.checkUnique(all, RuleSupport::normalize,
                i -> i == 0 ? path + ".correctAnswer" : path + ".distractors[" + (i - 1) + "]", errors);
    }

    @Override
    protected void checkQuestion(VisualClozeGameDsl game, VisualClozeQuestionDsl question,
            String path, List<ValidationError> errors) {
        if (game.effectiveMode() == VisualClozeMode.IMAGE) {
            checkImageQuestion(question, path, errors);
        } else {
            checkQuestion(question, path, errors);
        }
    }

    private static void checkImageQuestion(VisualClozeQuestionDsl question, String path,
            List<ValidationError> errors) {
        if (question.sceneImageUrl() == null || question.sceneImageUrl().isBlank()) {
            errors.add(new ValidationError(path + ".sceneImageUrl", "IMAGE mode yêu cầu sceneImageUrl"));
        }
        if (question.sceneWidth() == null || question.sceneWidth() <= 0) {
            errors.add(new ValidationError(path + ".sceneWidth", "sceneWidth phải lớn hơn 0"));
        }
        if (question.sceneHeight() == null || question.sceneHeight() <= 0) {
            errors.add(new ValidationError(path + ".sceneHeight", "sceneHeight phải lớn hơn 0"));
        }
        if (question.blanks() == null || question.blanks().isEmpty()) {
            errors.add(new ValidationError(path + ".blanks", "IMAGE mode yêu cầu ít nhất một blank"));
            return;
        }
        if (question.options() == null || question.options().isEmpty()) {
            errors.add(new ValidationError(path + ".options", "IMAGE mode yêu cầu danh sách options"));
            return;
        }

        Set<String> optionIds = new HashSet<>();
        Set<String> optionImageUrls = new HashSet<>();
        for (int i = 0; i < question.options().size(); i++) {
            var option = question.options().get(i);
            if (!optionIds.add(option.id())) {
                errors.add(new ValidationError(path + ".options[" + i + "].id", "option id phải duy nhất"));
            }
            if (option.imageUrl() == null || option.imageUrl().isBlank()) {
                errors.add(new ValidationError(path + ".options[" + i + "].imageUrl", "IMAGE mode yêu cầu ảnh option"));
            } else if (!optionImageUrls.add(option.imageUrl().trim())) {
                errors.add(new ValidationError(path + ".options[" + i + "].imageUrl", "URL ảnh lựa chọn không được trùng nhau"));
            }
        }

        Set<String> blankIds = new HashSet<>();
        Set<String> mappedOptionIds = new HashSet<>();
        for (int i = 0; i < question.blanks().size(); i++) {
            var blank = question.blanks().get(i);
            String blankPath = path + ".blanks[" + i + "]";
            if (!blankIds.add(blank.id())) {
                errors.add(new ValidationError(blankPath + ".id", "blank id phải duy nhất"));
            }
            if (question.sceneWidth() != null && (blank.x() < 50 || blank.x() > question.sceneWidth() - 50)) {
                errors.add(new ValidationError(blankPath + ".x", "Tâm blank phải cách mép ảnh tối thiểu 50 pixel"));
            }
            if (question.sceneHeight() != null && (blank.y() < 50 || blank.y() > question.sceneHeight() - 50)) {
                errors.add(new ValidationError(blankPath + ".y", "Tâm blank phải cách mép ảnh tối thiểu 50 pixel"));
            }
            if (!optionIds.contains(blank.correctOptionId())) {
                errors.add(new ValidationError(blankPath + ".correctOptionId", "Đáp án phải trỏ đến một option tồn tại"));
            }
            if (!mappedOptionIds.add(blank.correctOptionId())) {
                errors.add(new ValidationError(blankPath + ".correctOptionId", "Mỗi option chỉ được điền vào một blank"));
            }
        }
        if (question.options().size() < question.blanks().size()) {
            errors.add(new ValidationError(path + ".options", "Cần ít nhất một option đúng riêng cho mỗi blank"));
        }
    }

    private static void checkSingleBlank(String template, String path, List<ValidationError> errors) {
        Matcher matcher = UNDERSCORE_RUN.matcher(template);
        int blanks = 0;
        boolean exactLength = true;
        while (matcher.find()) {
            blanks++;
            exactLength &= matcher.group().equals(BLANK);
        }
        if (blanks != 1 || !exactLength) {
            errors.add(new ValidationError(path,
                    "sentenceTemplate phải có đúng một chỗ trống \"" + BLANK + "\" (3 dấu gạch dưới)"));
        }
    }
}
