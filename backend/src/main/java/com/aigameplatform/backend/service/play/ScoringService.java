package com.aigameplatform.backend.service.play;

import org.springframework.stereotype.Service;

@Service
public class ScoringService {

    public static final int BASE_POINTS = 1000;
    public static final int MIN_POINTS_IF_CORRECT = 500; // vẫn được điểm sàn dù trả lời sát giờ

    /**
     * Điểm giảm dần tuyến tính theo thời gian trả lời, chỉ áp dụng khi trả lời ĐÚNG.
     * Trả lời sai luôn = 0 điểm (không trừ điểm, giữ tinh thần "gentle feedback" toàn dự án).
     */
    public int calculateScore(boolean isCorrect, long timeSpentMs, long timeLimitMs) {
        if (!isCorrect) return 0;
        if (timeLimitMs <= 0) return BASE_POINTS;

        double ratio = Math.min(1.0, (double) Math.max(0, timeSpentMs) / timeLimitMs);
        int bonus = (int) ((BASE_POINTS - MIN_POINTS_IF_CORRECT) * (1 - ratio));
        return MIN_POINTS_IF_CORRECT + bonus;
    }
}
