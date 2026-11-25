package com.aigameplatform.backend.service.play.grading;

import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.session.GameSession;
import com.aigameplatform.backend.entity.session.Participant;
import tools.jackson.databind.JsonNode;

/**
 * Một lượt nộp đáp án đã qua kiểm tra chung. {@code index} là vị trí câu trong game (từ 0), đúng giá trị dùng để sinh mã
 * mờ; {@code existing} là bản ghi đang dở của câu này (chỉ Visual Cloze dạng ảnh có), {@code outcome} là
 * {@code TIMEOUT}, {@code SKIPPED} hoặc null.
 */
public record GradeContext(GameSession session, Participant participant, QuestionGame question, int index,
        PlayInteractionDetail existing, JsonNode request, String outcome, int timeSpentMs) {

    public String salt() {
        return session.getStudentOptionSalt();
    }
}
