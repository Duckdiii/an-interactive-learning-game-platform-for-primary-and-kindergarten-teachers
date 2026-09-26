package com.aigameplatform.backend.entity.question;

import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
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
@Table(name = "audio_visual_match_questions")
@Getter
@Setter
@NoArgsConstructor
public class AudioVisualMatchQuestion extends QuestionGame {

    // Đáp án: hình đúng. Âm thanh đọc nằm ở audioText/audioUrl của QuestionGame.
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "visualPrompt", column = @Column(name = "correct_visual_prompt")),
        @AttributeOverride(name = "imageUrl", column = @Column(name = "correct_image_url"))
    })
    private ImageChoice correct;

    @ElementCollection
    @CollectionTable(name = "audio_visual_match_distractors", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "distractor_order")
    private List<ImageChoice> distractors = new ArrayList<>();
}
