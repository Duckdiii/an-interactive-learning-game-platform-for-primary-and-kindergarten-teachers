package com.aigameplatform.backend.service.play.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.question.OrderStep;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class OrderingLayoutTest {

    private OrderingQuestion question(int steps) {
        OrderingQuestion question = new OrderingQuestion();
        List<OrderStep> list = new ArrayList<>();
        for (int i = 1; i <= steps; i++) {
            OrderStep step = new OrderStep();
            step.setText("bước " + i);
            step.setCorrectPosition(i);
            list.add(step);
        }
        question.setSteps(list);
        return question;
    }

    @Test
    void displayIsNeverTheCorrectOrderAndTheCorrectIdsVaryAcrossSessions() {
        OrderingQuestion question = question(4);
        Set<List<String>> keys = new HashSet<>();
        for (int s = 0; s < 40; s++) {
            OrderingLayout layout = new OrderingLayout(question, "salt-" + s, 0);
            assertThat(layout.correctOrder()).isNotEqualTo(layout.displayIds());
            assertThat(layout.correctOrder()).containsExactlyInAnyOrderElementsOf(layout.displayIds());
            keys.add(layout.correctOrder());
        }
        // Trước đây đáp án luôn là [s4, s1, s2, s3]; giờ phải đổi theo phiên.
        assertThat(keys.size()).isGreaterThan(5);
    }

    @Test
    void sameSaltAndIndexGiveTheSameLayout() {
        OrderingQuestion question = question(5);

        assertThat(new OrderingLayout(question, "x", 2).correctOrder())
                .isEqualTo(new OrderingLayout(question, "x", 2).correctOrder());
    }
}
