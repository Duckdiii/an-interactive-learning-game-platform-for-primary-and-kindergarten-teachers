package com.aigameplatform.backend.dto.dsl;

/** Một màn chơi của game. Các trường media do Backend điền (audioUrl, imageUrl) hoặc AI sinh (audioText, visualPrompt). */
public sealed interface QuestionDsl permits QuizQuestionDsl, AudioVisualMatchQuestionDsl, OddOneOutQuestionDsl, SpotTheTargetQuestionDsl, WordScrambleQuestionDsl, MatchingQuestionDsl, MemoryCardQuestionDsl, DragDropQuestionDsl, OrderingQuestionDsl, VisualClozeQuestionDsl {

    String id();

    int timeLimitSeconds();

    int points();

    String audioText();

    String audioUrl();

    String visualPrompt();

    String imageUrl();
}
