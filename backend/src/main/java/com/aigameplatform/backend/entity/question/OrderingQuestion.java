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

    // Aggregation: OrderingQuestion ◇ 2..* OrderStep. Không cascade, OrderStep có vòng đời độc lập.
    @OneToMany(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    @OrderBy("correctPosition ASC")
    private List<OrderStep> steps = new ArrayList<>();
}
