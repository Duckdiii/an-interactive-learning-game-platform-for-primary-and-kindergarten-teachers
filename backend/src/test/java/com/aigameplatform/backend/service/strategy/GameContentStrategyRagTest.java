package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.*;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GameContentStrategyRagTest {
    @Test
    void contextOverloadPreservesExistingPromptAndAddsGrounding() {
        var strategy = new QuizGameStrategy(new JsonMapper()) {
            @Override
            protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
                return "Questions about " + topic + " for " + grade;
            }
        };
        strategy.setPromptTemplate("Produce quiz JSON");
        String legacy = strategy.buildPrompt("addition", GradeLevel.GRADE_1);
        String grounded = strategy.buildPrompt("addition", GradeLevel.GRADE_1,
                "[math-g1-007] Cộng, trừ nhẩm trong phạm vi 10. Nguồn: PDF 188.");
        assertThat(legacy).isEqualTo("Produce quiz JSON\n\nQuestions about addition for GRADE_1");
        assertThat(grounded).contains(legacy, "math-g1-007", "PDF 188", "curriculum_context", "phạm vi");
        assertThat(strategy.buildPrompt("addition", GradeLevel.GRADE_1, "")).isEqualTo(legacy);
    }
}
