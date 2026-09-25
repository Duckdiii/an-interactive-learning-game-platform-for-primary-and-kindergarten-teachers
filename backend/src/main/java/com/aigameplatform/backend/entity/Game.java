package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameStatus status = GameStatus.DRAFT;

    // Composition: Game ◆ 1..* QuestionGame. Câu hỏi chết theo Game.
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "game_id", nullable = false)
    @OrderBy("itemIndex ASC")
    private List<QuestionGame> questions = new ArrayList<>();

    // Aggregation: Teacher tạo ra Game. Không cascade, Game không sở hữu Teacher.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private Teacher author;
}
