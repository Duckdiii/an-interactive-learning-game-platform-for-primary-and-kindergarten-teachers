package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
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

    private String sentenceTemplate;

    private String imageUrl;

    private String correctAnswer;
}
