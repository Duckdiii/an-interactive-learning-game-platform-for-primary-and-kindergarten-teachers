package com.aigameplatform.backend.dto.dsl.ai;

import java.util.List;

/** Một màn chơi do AI sinh ra. Không có id, điểm, thời gian hay URL: các thứ đó do Backend bổ sung. */
public sealed interface AiQuestion permits QuizAiQuestion, AudioVisualMatchAiQuestion, OddOneOutAiQuestion, SpotTheTargetAiQuestion, WordScrambleAiQuestion, MatchingAiQuestion, MemoryCardAiQuestion, DragDropAiQuestion, OrderingAiQuestion, VisualClozeAiQuestion {

    /** Các vấn đề JSON Schema không diễn tả được (ví dụ chỉ số vượt quá số phần tử); rỗng nếu ổn. */
    default List<String> problems() {
        return List.of();
    }
}
