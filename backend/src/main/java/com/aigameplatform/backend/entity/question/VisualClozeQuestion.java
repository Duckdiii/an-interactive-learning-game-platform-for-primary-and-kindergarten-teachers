package com.aigameplatform.backend.entity.question;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "visual_cloze_questions")
@Getter
@Setter
@NoArgsConstructor
public class VisualClozeQuestion extends QuestionGame {

    // Câu có đúng một chỗ trống "___". Ảnh minh họa nằm ở visualPrompt/imageUrl của QuestionGame.
    private String sentenceTemplate;

    // Đáp án đúng.
    private String correctAnswer;

    @ElementCollection
    @CollectionTable(name = "visual_cloze_distractors", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "distractor_order")
    @Column(name = "distractor_value")
    private List<String> distractors = new ArrayList<>();
}
