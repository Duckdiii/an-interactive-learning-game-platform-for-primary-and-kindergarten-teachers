package com.aigameplatform.backend.entity.interaction;

import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.question.QuestionGame;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "play_interaction_details")
@Getter
@Setter
@NoArgsConstructor
public class PlayInteractionDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private int attemptsCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InteractionStatus status;

    private int durationSeconds;

    // Aggregation: PlayInteractionDetail ◇ 1 QuestionGame. Không cascade, câu hỏi có vòng đời độc lập.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private QuestionGame question;
}
