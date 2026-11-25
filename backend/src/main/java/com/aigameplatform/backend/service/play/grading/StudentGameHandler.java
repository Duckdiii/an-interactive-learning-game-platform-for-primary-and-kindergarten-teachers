package com.aigameplatform.backend.service.play.grading;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.question.QuestionGame;
import java.util.Map;
import tools.jackson.databind.node.ObjectNode;

/**
 * Cách một loại game phục vụ học sinh: giấu đáp án khỏi đề ({@link #redact}) và chấm một lượt trả lời
 * ({@link #grade}). Mỗi loại game một bean; thêm loại mới là thêm một class, {@code StudentPlayService} không sửa.
 * Bộ giải mã nhãn cho thống kê đi cặp với bean này ở {@code service/play/insight}.
 */
public interface StudentGameHandler {

    boolean supports(Game game);

    /** Bỏ trường đáp án và đổi sang dạng học sinh (mã mờ, xáo thứ tự) trên một câu trong đề đã dựng từ DSL. */
    void redact(RedactContext context, ObjectNode questionNode, QuestionGame question, int index);

    /** Chấm, lưu {@code PlayInteractionDetail} và trả kết quả cho học sinh (đã qua kiểm tra phiên, học sinh, câu hỏi). */
    Map<String, Object> grade(GradeContext context);
}
