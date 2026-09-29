package com.aigameplatform.backend.dto.dsl.ai;

import java.util.List;

/** Kết quả AI trả về cho một loại game: chỉ gồm danh sách màn chơi. */
public sealed interface AiGameOutput permits QuizAiOutput, AudioVisualMatchAiOutput, OddOneOutAiOutput, SpotTheTargetAiOutput, WordScrambleAiOutput, MatchingAiOutput, MemoryCardAiOutput, DragDropAiOutput, OrderingAiOutput, VisualClozeAiOutput {

    List<? extends AiQuestion> questions();
}
