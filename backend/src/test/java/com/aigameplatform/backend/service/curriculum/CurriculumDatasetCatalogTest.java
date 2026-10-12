package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumDatasetCatalogTest {
    private static final CurriculumSource SOURCE = new CurriculumSource(
            "curriculum.pdf", "a".repeat(64), "32/2018/TT-BGDĐT", "math-g1-v1", 2);

    @Test
    void loadsEveryIndexedReviewedScopeWithoutCombiningThemIntoOneDataset() throws Exception {
        var datasets = CurriculumDataset.loadAllReviewed();
        var catalog = new CurriculumDatasetCatalog(datasets);

        assertThat(datasets).hasSize(15);
        for (Subject subject : Subject.values()) {
            for (int grade = 1; grade <= 5; grade++) {
                assertThat(catalog.find(subject, GradeLevel.valueOf("GRADE_" + grade)))
                        .as("active reviewed corpus for %s/GRADE_%s", subject, grade)
                        .isPresent();
            }
        }
        assertThat(datasets.stream().flatMap(d -> d.chunks().stream()).map(CurriculumChunk::chunkId).distinct())
                .hasSize(datasets.stream().mapToInt(d -> d.chunks().size()).sum());
    }

    @Test
    void loadsSourceFrozenGradeTwoEvaluationAndHoldoutFixtures() throws Exception {
        var grade2 = CurriculumDataset.loadAllReviewed().stream()
                .filter(dataset -> dataset.chunks().stream().anyMatch(chunk -> !chunk.control()
                        && chunk.gradeLevel() == GradeLevel.GRADE_2)).findFirst().orElseThrow();
        var queries = CurriculumEvaluation.loadQueries(Subject.MATH, GradeLevel.GRADE_2);
        var holdout = CurriculumHoldout.load(grade2);

        assertThat(queries).hasSize(13);
        assertThat(queries.stream().filter(query -> !query.negative())).hasSize(10);
        assertThat(holdout).hasSize(12);
        assertThat(holdout.stream().filter(query -> query.kind() == CurriculumHoldout.Kind.NEAR_MISS)).hasSize(3);
        assertThat(grade2.chunks().stream().filter(CurriculumChunk::control)).hasSize(4)
                .allSatisfy(control -> assertThat(control.subject() != Subject.MATH
                        || control.gradeLevel() != GradeLevel.GRADE_2).isTrue());
        assertThat(queries.stream().filter(query -> !query.negative())
                .flatMap(query -> query.expectedChunkIds().stream()).distinct())
                .allSatisfy(id -> assertThat(grade2.chunks().stream().anyMatch(chunk -> chunk.chunkId().equals(id)
                        && !chunk.control())).isTrue());
    }

    @Test
    void resolvesScopeFromPrimaryChunksAndDoesNotRegisterControlScopes() {
        var primary = chunk("math-g1", Subject.MATH, GradeLevel.GRADE_1, false);
        var control = chunk("vietnamese-control", Subject.VIETNAMESE, GradeLevel.GRADE_1, true);
        var dataset = new CurriculumDataset(SOURCE, List.of(primary, control));

        var catalog = new CurriculumDatasetCatalog(List.of(dataset));

        assertThat(catalog.find(Subject.MATH, GradeLevel.GRADE_1)).containsSame(dataset);
        assertThat(catalog.find(Subject.VIETNAMESE, GradeLevel.GRADE_1)).isEmpty();
    }

    @Test
    void rejectsTwoDatasetsForOneActiveScope() {
        var first = new CurriculumDataset(SOURCE,
                List.of(chunk("math-g1-a", Subject.MATH, GradeLevel.GRADE_1, false)));
        var second = new CurriculumDataset(new CurriculumSource("other.pdf", "b".repeat(64),
                "32/2018/TT-BGDĐT", "math-g1-v2", 2),
                List.of(chunk("math-g1-b", Subject.MATH, GradeLevel.GRADE_1, false)));

        assertThatThrownBy(() -> new CurriculumDatasetCatalog(List.of(first, second)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MATH")
                .hasMessageContaining("GRADE_1");
    }

    @Test
    void validatesCatalogEntriesAndRequiresOnePrimaryScopePerDataset() {
        assertThatThrownBy(() -> new CurriculumDatasetCatalog(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("At least one");
        assertThatThrownBy(() -> new CurriculumDatasetCatalog(List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("At least one");
        assertThatThrownBy(() -> new CurriculumDatasetCatalog(java.util.Arrays.asList((CurriculumDataset) null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("null entries");

        var gradeOne = chunk("math-g1", Subject.MATH, GradeLevel.GRADE_1, false);
        var gradeTwo = chunk("math-g2", Subject.MATH, GradeLevel.GRADE_2, false);
        var crossScope = new CurriculumDataset(SOURCE, List.of(gradeOne, gradeTwo));
        assertThatThrownBy(() -> new CurriculumDatasetCatalog(List.of(crossScope)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("one scope");
        var controlsOnly = new CurriculumDataset(SOURCE,
                List.of(chunk("math-g2-control", Subject.MATH, GradeLevel.GRADE_2, true)));
        assertThatThrownBy(() -> new CurriculumDatasetCatalog(List.of(controlsOnly)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("one scope");
    }

    @Test
    void exposesActiveDatasetsAndRejectsNullScopeArguments() {
        var dataset = new CurriculumDataset(SOURCE,
                List.of(chunk("math-g1", Subject.MATH, GradeLevel.GRADE_1, false)));
        var catalog = new CurriculumDatasetCatalog(List.of(dataset));

        assertThat(catalog.activeDatasets()).containsExactly(dataset);
        assertThatThrownBy(() -> catalog.find(null, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("required");
        assertThatThrownBy(() -> catalog.find(Subject.MATH, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("required");
    }

    @Test
    void selectsExactlyOneReviewedDatasetForPerScopeEvaluation() throws Exception {
        var catalog = new CurriculumDatasetCatalog(CurriculumDataset.loadAllReviewed());

        var selected = catalog.select(Subject.ENGLISH, GradeLevel.GRADE_3);

        assertThat(selected).hasSize(1);
        assertThat(selected.getFirst().chunks()).allSatisfy(chunk -> {
            if (!chunk.control()) {
                assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
                assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            }
        });
    }

    @Test
    void mapsAllSubjectGradeResourcesAndRejectsInvalidGrade() {
        assertThat(CurriculumDataset.resourceRootFor(Subject.MATH, GradeLevel.GRADE_5))
                .endsWith("math-grade5/");
        assertThat(CurriculumDataset.resourceRootFor(Subject.VIETNAMESE, GradeLevel.GRADE_3))
                .endsWith("vietnamese-grade3/");
        assertThat(CurriculumDataset.resourceRootFor(Subject.ENGLISH, GradeLevel.GRADE_2))
                .endsWith("english-grade2-familiarization/");
        assertThat(CurriculumDataset.resourceRootFor(Subject.ENGLISH, GradeLevel.GRADE_3))
                .endsWith("english-grade3-foreign-language/");
        assertThatThrownBy(() -> CurriculumDataset.resourceRootFor(Subject.MATH, GradeLevel.KINDERGARTEN))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Primary subject");
        assertThatThrownBy(() -> CurriculumDataset.resourceRootFor(null, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Primary subject");
    }

    @Test
    void loadsSourceFrozenGradeThreeEvaluationAndHoldoutFixtures() throws Exception {
        var gradeThree = CurriculumDataset.loadAllReviewed().stream()
                .filter(dataset -> dataset.chunks().stream().anyMatch(chunk -> !chunk.control()
                        && chunk.gradeLevel() == GradeLevel.GRADE_3)).findFirst().orElseThrow();
        var queries = CurriculumEvaluation.loadQueries(Subject.MATH, GradeLevel.GRADE_3);
        var holdout = CurriculumHoldout.load(gradeThree);

        assertThat(gradeThree.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(51);
        assertThat(gradeThree.chunks()).filteredOn(CurriculumChunk::control).hasSize(4);
        assertThat(queries).hasSize(13);
        assertThat(queries).filteredOn(query -> !query.negative()).hasSize(10);
        assertThat(holdout).hasSize(12);
        assertThat(holdout).filteredOn(query -> query.kind() == CurriculumHoldout.Kind.NEAR_MISS).hasSize(3);
        assertThat(queries.stream().filter(query -> !query.negative())
                .flatMap(query -> query.expectedChunkIds().stream()).distinct())
                .allSatisfy(id -> assertThat(gradeThree.chunks().stream().anyMatch(chunk -> chunk.chunkId().equals(id)
                        && !chunk.control())).isTrue());
    }

    @Test
    void everyActiveScopeHasSourceFrozenExploratoryAndIndependentHoldoutFixtures() throws Exception {
        var datasets = CurriculumDataset.loadAllReviewed();

        for (var dataset : datasets) {
            var primary = dataset.chunks().stream().filter(chunk -> !chunk.control()).findFirst().orElseThrow();
            var queries = CurriculumEvaluation.loadQueries(primary.subject(), primary.gradeLevel());
            var holdout = CurriculumHoldout.load(dataset);

            assertThat(queries).as("exploratory queries for %s/%s", primary.subject(), primary.gradeLevel())
                    .hasSize(13);
            assertThat(queries).filteredOn(query -> !query.negative()).hasSize(10);
            assertThat(queries).filteredOn(query -> query.negative()).hasSize(3);
            assertThat(holdout).as("independent holdout for %s/%s", primary.subject(), primary.gradeLevel())
                    .hasSize(12);
            assertThat(holdout).filteredOn(query -> query.kind() == CurriculumHoldout.Kind.POSITIVE).hasSize(6);
            assertThat(holdout).filteredOn(query -> query.kind() == CurriculumHoldout.Kind.NEGATIVE).hasSize(3);
            assertThat(holdout).filteredOn(query -> query.kind() == CurriculumHoldout.Kind.NEAR_MISS).hasSize(3);
        }
    }
    private static CurriculumChunk chunk(String id, Subject subject, GradeLevel grade, boolean control) {
        return new CurriculumChunk(id, subject, grade, "topic", "Outcome " + id, control,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Outcome " + id)));
    }
}
