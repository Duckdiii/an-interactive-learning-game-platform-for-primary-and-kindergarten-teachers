package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import org.junit.jupiter.api.Test;

class CurriculumComparisonScopeTest {
    @Test
    void comparisonLoadsTheRequestedCorpusForEveryPrimarySubjectAndGrade() throws Exception {
        for (Subject subject : Subject.values()) {
            for (int grade = 1; grade <= 5; grade++) {
                var level = GradeLevel.valueOf("GRADE_" + grade);
                var dataset = CurriculumGenerationComparisonRunner.loadDataset(subject, level);
                assertThat(dataset.chunks().stream().filter(chunk -> !chunk.control()))
                        .isNotEmpty().allSatisfy(chunk -> {
                            assertThat(chunk.subject()).isEqualTo(subject);
                            assertThat(chunk.gradeLevel()).isEqualTo(level);
                        });
            }
        }
        assertThatThrownBy(() -> CurriculumGenerationComparisonRunner.loadDataset(Subject.MATH, GradeLevel.KINDERGARTEN))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
