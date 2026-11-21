package com.aigameplatform.backend.dto.dsl.ai;

import java.util.List;

/** Kết quả AI trả về cho một loại game: danh sách màn chơi và tên game ngắn (có thể thiếu). */
public sealed interface AiGameOutput permits QuizAiOutput, AudioVisualMatchAiOutput, OddOneOutAiOutput, SpotTheTargetAiOutput, WordScrambleAiOutput, MatchingAiOutput, MemoryCardAiOutput, DragDropAiOutput, OrderingAiOutput, VisualClozeAiOutput {

    List<? extends AiQuestion> questions();

    String title();

    /** Cách trình bày AI đề xuất; có thể thiếu. */
    AiPresentation presentation();
}
