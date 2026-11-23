package com.aigameplatform.backend.service.play.insight;

import com.aigameplatform.backend.entity.question.QuestionGame;
import java.util.List;
import java.util.Optional;
import tools.jackson.databind.JsonNode;

/** Dựng nhãn đọc được cho một đáp án sai đã lưu, theo từng loại game (thêm loại mới là thêm một bean). */
public interface WrongAnswerLabeler {

    boolean supports(QuestionGame question);

    default List<String> labels(QuestionGame question, int index, String salt, JsonNode answer) {
        return label(question, index, salt, answer).stream().toList();
    }

    default boolean labelsRetryMistakes() {
        return false;
    }

    /**
     * @param index  vị trí câu trong game (từ 0), đúng giá trị đã dùng khi sinh mã mờ lúc chơi
     * @param salt   salt của phiên (đáp án chọn lưu dạng mã mờ theo salt)
     * @param answer nội dung `answer_json` đã parse
     * @return nhãn, hoặc rỗng nếu không dựng được
     */
    Optional<String> label(QuestionGame question, int index, String salt, JsonNode answer);
}
