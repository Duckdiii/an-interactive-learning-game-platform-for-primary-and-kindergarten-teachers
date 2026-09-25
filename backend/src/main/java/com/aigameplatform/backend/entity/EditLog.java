package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.EditorType;
import com.aigameplatform.backend.entity.question.QuestionGame;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "edit_logs")
@Getter
@Setter
@NoArgsConstructor
public class EditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EditorType editedBy;

    @Column(nullable = false)
    private LocalDateTime editedAt;

    // Association: EditLog 0..* - 1 QuestionGame.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private QuestionGame question;
}
