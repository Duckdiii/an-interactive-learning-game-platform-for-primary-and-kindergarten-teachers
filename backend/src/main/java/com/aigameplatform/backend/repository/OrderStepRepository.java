package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.question.OrderStep;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStepRepository extends JpaRepository<OrderStep, String> {
    /** Independent aggregation: persist new references without cascading removal of existing steps. */
    default void saveNewSteps(Game game) {
        var steps = game.getQuestions().stream().filter(OrderingQuestion.class::isInstance)
                .map(OrderingQuestion.class::cast).flatMap(question -> question.getSteps().stream())
                .filter(step -> step.getStepId() == null).toList();
        if (!steps.isEmpty()) saveAll(steps);
    }
}
