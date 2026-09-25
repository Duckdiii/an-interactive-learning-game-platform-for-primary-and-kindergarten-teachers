package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ordering_questions")
@Getter
@Setter
@NoArgsConstructor
public class OrderingQuestion extends QuestionGame {

    // Composition: OrderingQuestion ◆ 2..* OrderStep. Bước chết theo câu hỏi.
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "question_id", nullable = false)
    @OrderBy("correctPosition ASC")
    private List<OrderStep> steps = new ArrayList<>();
}
