package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.*;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.Subject;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GameContentStrategyRagTest {
    @Test
    void preschoolQuizDoesNotInferWoodFromFurnitureNamesAndSuppliesTeacherReadFacts() {
        String prompt=new QuizGameStrategy(new JsonMapper()).buildPrompt(
                "Cô đọc tên bàn ghế, trẻ chọn từ gọi chung",Subject.VIETNAMESE,GradeLevel.KINDERGARTEN,
                "[kg-lang-vocabulary-45] Hiểu nghĩa từ khái quát: rau quả, con vật, đồ gỗ");
        assertThat(prompt).contains("chất liệu", "bằng gỗ", "giáo viên đọc", "lời dẫn", "không suy");
    }
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

    @Test
    void everyExistingStrategyBuildsItsOwnGroundedPromptForTheRequestedScope() {
        var mapper = new JsonMapper();
        var cases = List.of(
                new PromptCase(new QuizGameStrategy(mapper), "correctIndex", "trắc nghiệm"),
                new PromptCase(new MatchingGameStrategy(mapper), "pairs", "ghép"),
                new PromptCase(new MemoryCardGameStrategy(mapper), "pairs", "cặp"),
                new PromptCase(new DragDropGameStrategy(mapper), "zoneIndex", "kéo-thả"),
                new PromptCase(new OrderingGameStrategy(mapper), "correctPosition", "thứ tự"),
                new PromptCase(new WordScrambleGameStrategy(mapper), "scrambledLetters", "xáo"),
                new PromptCase(new OddOneOutGameStrategy(mapper), "oddOneOutIndex", "khác biệt"),
                new PromptCase(new VisualClozeGameStrategy(mapper), "sentenceTemplate", "chỗ trống"),
                new PromptCase(new AudioVisualMatchGameStrategy(mapper), "correct", "âm thanh"),
                new PromptCase(new SpotTheTargetGameStrategy(mapper), "targetDescription", "mục tiêu"));

        for (var testCase : cases) {
            String prompt = testCase.strategy().buildPrompt("Teacher topic", Subject.ENGLISH,
                    GradeLevel.GRADE_3, "[eng-g3-001] Official outcome; PDF 21");

            assertThat(prompt).as(testCase.strategy().getSupportedType().name())
                    .contains("ENGLISH", "GRADE_3", "Teacher topic", "eng-g3-001", "PDF 21",
                            testCase.schemaField(), testCase.mechanicCue())
                    .doesNotContain("Toán lớp 1", "4 lựa chọn cho mỗi câu");
        }
    }

    @Test
    void quizPromptSupportsOtherSubjectsAndGradesWithoutTheMathOnePilotConstraint() {
        String prompt = new QuizGameStrategy(new JsonMapper()).buildPrompt("describe a family", Subject.ENGLISH,
                GradeLevel.GRADE_5, "[eng-g5-001] Describe family members; PDF 80");

        assertThat(prompt).contains("ENGLISH", "GRADE_5", "describe a family", "eng-g5-001", "correctIndex")
                .doesNotContain("Toán lớp 1", "only supports GRADE_1");
    }

    private record PromptCase(GameContentStrategy<?, ?> strategy, String schemaField, String mechanicCue) { }

    @Test
    void aiContentPromptsDoNotRequireFactoryGeneratedDslFields() {
        var mapper = new JsonMapper();
        for (var strategy : List.of(new MatchingGameStrategy(mapper), new MemoryCardGameStrategy(mapper),
                new DragDropGameStrategy(mapper), new OddOneOutGameStrategy(mapper))) {
            assertThat(strategy.buildPrompt("Teacher topic", GradeLevel.GRADE_1))
                    .as(strategy.getSupportedType().name())
                    .doesNotContain("pairId", "targetZoneId", "oddOneOutId", "một content");
        }
    }
}
