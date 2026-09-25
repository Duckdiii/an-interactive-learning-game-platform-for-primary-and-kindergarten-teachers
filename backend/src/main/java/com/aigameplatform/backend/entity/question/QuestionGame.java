package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "question_games")
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
@NoArgsConstructor
public abstract class QuestionGame {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private int itemIndex;

    private int timeLimit;

    private int point;
}
