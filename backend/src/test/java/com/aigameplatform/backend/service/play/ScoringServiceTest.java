package com.aigameplatform.backend.service.play;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ScoringServiceTest {

    private final ScoringService scoringService = new ScoringService();

    @Test
    @DisplayName("Trả lời sai luôn nhận 0 điểm, không bị trừ điểm")
    void testWrongAnswerGivesZeroPoints() {
        int score = scoringService.calculateScore(false, 1000L, 30_000L);
        assertThat(score).isZero();
    }

    @Test
    @DisplayName("Trả lời đúng ngay lập tức (0ms) nhận trọn vẹn BASE_POINTS = 1000 điểm")
    void testInstantCorrectAnswerGivesBasePoints() {
        int score = scoringService.calculateScore(true, 0L, 30_000L);
        assertThat(score).isEqualTo(1000);
    }

    @Test
    @DisplayName("Trả lời đúng sau một nửa thời gian nhận điểm trung bình tuyến tính = 750 điểm")
    void testHalfTimeCorrectAnswer() {
        int score = scoringService.calculateScore(true, 15_000L, 30_000L);
        assertThat(score).isEqualTo(750);
    }

    @Test
    @DisplayName("Trả lời đúng sát giờ (đúng deadline) vẫn nhận điểm sàn MIN_POINTS_IF_CORRECT = 500 điểm")
    void testDeadlineCorrectAnswerGivesFloorPoints() {
        int score = scoringService.calculateScore(true, 30_000L, 30_000L);
        assertThat(score).isEqualTo(500);
    }

    @Test
    @DisplayName("Trả lời đúng sau khi hết giờ tỷ lệ giới hạn ở 1.0 và nhận điểm sàn 500 điểm")
    void testOvertimeCorrectAnswerCappedAtFloorPoints() {
        int score = scoringService.calculateScore(true, 45_000L, 30_000L);
        assertThat(score).isEqualTo(500);
    }

    @Test
    @DisplayName("Thời gian giới hạn không hợp lệ (<= 0) trả về BASE_POINTS")
    void testZeroOrNegativeTimeLimit() {
        int score = scoringService.calculateScore(true, 5000L, 0L);
        assertThat(score).isEqualTo(1000);
    }
}
