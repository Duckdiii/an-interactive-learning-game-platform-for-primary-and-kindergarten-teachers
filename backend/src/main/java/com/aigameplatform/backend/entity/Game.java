package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import com.aigameplatform.backend.entity.question.QuestionGame;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "games")
@Getter
@Setter
@NoArgsConstructor
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(length = 200)
    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameType gameType;

    private int questionNum;

    @Enumerated(EnumType.STRING)
    private GradeLevel grade;

    @Enumerated(EnumType.STRING)
    private Subject subject;

    @Column(unique = true)
    private String shareCode;

    private String version;

    // Phiên bản Game JSON DSL mà game này tuân theo, để chọn bộ chuyển đổi tương thích khi có phiên bản mới.
    @Column(nullable = false, length = 20)
    private String schemaVersion = "1.0.0";

    /** Null preserves legacy TEXT semantics for existing Visual Cloze rows. */
    @Enumerated(EnumType.STRING)
    @Column(name = "visual_cloze_mode", length = 16)
    private VisualClozeMode visualClozeMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "odd_one_out_mode", length = 16)
    private OddOneOutMode oddOneOutMode;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameStatus status = GameStatus.DRAFT;

    // Composition: Game ◆ 1..* QuestionGame. Câu hỏi chết theo Game.
    @OneToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "game_id", nullable = false)
    @OrderBy("itemIndex ASC")
    private List<QuestionGame> questions = new ArrayList<>();

    // Aggregation: Teacher tạo ra Game. Không cascade, Game không sở hữu Teacher.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private Teacher author;

    public VisualClozeMode effectiveVisualClozeMode() {
        return visualClozeMode == null ? VisualClozeMode.TEXT : visualClozeMode;
    }
}
