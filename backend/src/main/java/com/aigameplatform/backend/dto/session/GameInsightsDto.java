package com.aigameplatform.backend.dto.session;

import java.util.List;

/** Thống kê tổng hợp theo câu của một game (UC-18), không chứa biệt danh hay định danh học sinh. */
public record GameInsightsDto(
        int playCount,
        double correctRate,
        double avgAttemptsPerQuestion,
        // Tỉ lệ học sinh đã làm hết các câu (0..1) và điểm trung bình mỗi học sinh đã chơi (UC-18 bước 4).
        double completionRate,
        double avgScore,
        boolean lowSample,
        List<QuestionInsightDto> questions) {

    /** Chi tiết một câu (UC-18 bước 5): phân bố đáp án đã chọn, chỉ nêu đáp án lặp từ 2 lần, còn lại gộp vào `otherCount`. */
    public record QuestionDetailDto(
            String questionId,
            int order,
            String text,
            int answeredCount,
            double correctRate,
            boolean needsReview,
            List<AnswerShareDto> distribution,
            int otherCount,
            int noAnswerCount) {
    }

    public record AnswerShareDto(String label, int count, boolean correct) {
    }

    /** Một câu yếu của một game, cho khối "Lớp mình cần ôn lại" ở trang chủ. */
    public record ReviewNeededDto(
            String gameId,
            String gameTitle,
            String questionId,
            String questionText,
            double correctRate,
            CommonWrongDto commonWrong) {
    }

    public record QuestionInsightDto(
            String questionId,
            int order,
            String text,
            int answeredCount,
            double correctRate,
            double avgAttempts,
            boolean needsReview,
            List<CommonWrongDto> commonWrong) {
    }

    public record CommonWrongDto(String label, int count) {
    }
}
