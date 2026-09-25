package com.aigameplatform.backend.entity.question;

import com.aigameplatform.backend.entity.EditLog;
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
    protected String id;

    protected int itemIndex;

    protected int timeLimit;

    protected int point;

    // Association: QuestionGame 1 - 0..* EditLog. EditLog giữ khóa ngoại (mappedBy), không cascade.
    @OneToMany(mappedBy = "question", fetch = FetchType.LAZY)
    protected List<EditLog> editLogs = new ArrayList<>();
}
