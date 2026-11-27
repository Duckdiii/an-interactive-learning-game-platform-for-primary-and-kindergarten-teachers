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

    // Các bản ghi cũ có thể tham chiếu một câu. Bản ghi mới ghi đường dẫn ở cấp game.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private QuestionGame question;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(name = "editor_teacher_id")
    private String editorTeacherId;

    /** JSON array of changed JSON Pointer paths. No field values are retained. */
    @Column(name = "changed_paths", nullable = false, columnDefinition = "text")
    private String changedPaths;
}
