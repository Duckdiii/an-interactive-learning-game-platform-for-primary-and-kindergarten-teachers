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

    // Persist new steps with their question. Removing a question does not delete its independent steps.
    @OneToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "question_id")
    @OrderBy("correctPosition ASC")
    private List<OrderStep> steps = new ArrayList<>();
}
