package com.aigameplatform.backend.service.curriculum;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumHoldoutTest {
    @Test
    void loadsFrozenHoldoutWhoseGoldRefsResolveToSourceChunks() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var holdout = CurriculumHoldout.loadDefault(dataset);

        assertEquals(12, holdout.size());
        assertEquals(6, holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.POSITIVE).count());
        assertEquals(3, holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.NEGATIVE).count());
        assertEquals(3, holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.NEAR_MISS).count());
        assertTrue(holdout.stream().allMatch(q -> q.sourceSha256().equals(dataset.source().sourceSha256())));
        assertTrue(holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.POSITIVE)
                .flatMap(q -> q.expectedChunkIds().stream()).allMatch(id -> dataset.chunks().stream()
                        .anyMatch(chunk -> chunk.chunkId().equals(id) && !chunk.control())));
    }

    @Test
    void loadsFreshVersionedHoldoutWithSourceGoldAndNoReusedGradeOnePositiveChunks() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var oldExpected = CurriculumHoldout.load(dataset, "v1").stream()
                .flatMap(query -> query.expectedChunkIds().stream()).collect(java.util.stream.Collectors.toSet());
        var fresh = CurriculumHoldout.load(dataset, "v2");

        assertEquals(12, fresh.size());
        assertEquals(6, fresh.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.POSITIVE).count());
        assertEquals(3, fresh.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.NEGATIVE).count());
        assertEquals(3, fresh.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.NEAR_MISS).count());
        assertTrue(fresh.stream().noneMatch(q -> oldExpected.stream().anyMatch(q.expectedChunkIds()::contains)));
        assertTrue(fresh.stream().allMatch(q -> q.sourceSha256().equals(dataset.source().sourceSha256())));
    }

    @Test
    void sourceValidatesFreshHoldoutsForEveryPreviouslyExposedMathGrade() throws Exception {
        var datasets = CurriculumDataset.loadAllReviewed();
        for (var grade : List.of(com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1,
                com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_2,
                com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_3)) {
            var dataset = datasets.stream().filter(candidate -> candidate.chunks().stream().anyMatch(chunk ->
                    chunk.subject() == com.aigameplatform.backend.entity.enums.Subject.MATH
                            && chunk.gradeLevel() == grade && !chunk.control())).findFirst().orElseThrow();
            var fresh = CurriculumHoldout.load(dataset, "v2");
            assertEquals(12, fresh.size());
            assertTrue(fresh.stream().allMatch(query -> query.sourceSha256().equals(dataset.source().sourceSha256())));
        }
    }

    @Test
    void preparesSourceTraceablePositiveNegativeAndNearMissHoldoutForAllFifteenScopes() throws Exception {
        var datasets = CurriculumDataset.loadAllReviewed();
        assertEquals(15, datasets.size());
        for (var dataset : datasets) {
            var first = dataset.chunks().stream().filter(chunk -> !chunk.control()).findFirst().orElseThrow();
            String version = first.subject() == com.aigameplatform.backend.entity.enums.Subject.MATH
                    && List.of(com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1,
                            com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_2,
                            com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_3).contains(first.gradeLevel())
                    ? "v2" : "v1";
            var holdout = CurriculumHoldout.load(dataset, version);

            assertEquals(12, holdout.size(), first.subject() + "/" + first.gradeLevel());
            assertEquals(6, holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.POSITIVE).count());
            assertEquals(3, holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.NEGATIVE).count());
            assertEquals(3, holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.NEAR_MISS).count());
            assertTrue(holdout.stream().allMatch(q -> q.sourceSha256().equals(dataset.source().sourceSha256())
                    && q.sourceDocument().equals(dataset.source().sourceDocument())
                    && q.sourcePdfPage() > 0 && !q.goldRationale().isBlank()));
            assertTrue(holdout.stream().filter(q -> q.kind() == CurriculumHoldout.Kind.POSITIVE)
                    .flatMap(q -> q.expectedChunkIds().stream()).allMatch(id -> dataset.chunks().stream()
                            .anyMatch(chunk -> chunk.chunkId().equals(id) && !chunk.control())));
            assertTrue(holdout.stream().filter(q -> q.kind() != CurriculumHoldout.Kind.POSITIVE)
                    .allMatch(q -> q.expectedChunkIds().isEmpty()));
        }
        // Gold labels, especially v2 for previously exposed MATH G1–G3, still require independent review.
    }

    @Test
    void reportsHitsFalseRejectionsAndFalseAcceptancesWithExplicitDenominators() {
        var queries = List.of(
                query("p1", CurriculumHoldout.Kind.POSITIVE, List.of("c1")),
                query("p2", CurriculumHoldout.Kind.POSITIVE, List.of("c2")),
                query("n1", CurriculumHoldout.Kind.NEGATIVE, List.of()),
                query("m1", CurriculumHoldout.Kind.NEAR_MISS, List.of()));
        var rows = List.of(
                row(queries.get(0), List.of(chunk("c1"))), row(queries.get(1), List.of(chunk("wrong"))),
                row(queries.get(2), List.of(chunk("c1"))), row(queries.get(3), List.of()));

        assertTrue(rows.get(1).falseRejection());

        var summary = CurriculumHoldout.summarize(rows);

        assertEquals(1, summary.hits());
        assertEquals(1, summary.falseRejections());
        assertEquals(1, summary.falseAcceptances());
        assertEquals(0, summary.leakedChunks());
        assertEquals("1/2", summary.hitAt3Fraction());
        assertFalse(summary.passed());
    }

    @Test
    void onlyPassesWhenTheFrozenPositiveNegativeAndNearMissGatesAllPass() {
        var rows = new java.util.ArrayList<CurriculumHoldout.Row>();
        for (int i = 1; i <= 6; i++) {
            var query = query("p" + i, CurriculumHoldout.Kind.POSITIVE, List.of("c" + i));
            rows.add(row(query, List.of(chunk("c" + i))));
        }
        for (int i = 1; i <= 3; i++) {
            rows.add(row(query("n" + i, CurriculumHoldout.Kind.NEGATIVE, List.of()), List.of()));
            rows.add(row(query("m" + i, CurriculumHoldout.Kind.NEAR_MISS, List.of()), List.of()));
        }

        var summary = CurriculumHoldout.summarize(rows);

        assertTrue(summary.passed());
        assertEquals(12, summary.queryCount());
        assertEquals("6/6", summary.hitAt3Fraction());
        assertEquals("3/3", summary.negativeRejectionFraction());
        assertEquals("3/3", summary.nearMissRejectionFraction());
        assertEquals("0/6", summary.falseAcceptanceFraction());
    }

    @Test
    void rejectsDuplicateIdsOrMissingGoldReferences() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        assertThrows(IllegalArgumentException.class, () -> CurriculumHoldout.validate(List.of(
                query("same", CurriculumHoldout.Kind.NEGATIVE, List.of()),
                query("same", CurriculumHoldout.Kind.NEGATIVE, List.of())), dataset));
        assertThrows(IllegalArgumentException.class, () -> CurriculumHoldout.validate(List.of(
                query("positive", CurriculumHoldout.Kind.POSITIVE, List.of("unknown"))), dataset));
    }

    private static CurriculumHoldout.Query query(String id, CurriculumHoldout.Kind kind, List<String> expected) {
        return new CurriculumHoldout.Query(id, kind, "topic", expected,
                "cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013",
                "Thông-tư-32-2018-TT-BGDĐT.pdf", 188, "source-backed gold");
    }

    private static CurriculumHoldout.Row row(CurriculumHoldout.Query query,
                                               List<CurriculumRAGService.RetrievedChunk> returned) {
        return new CurriculumHoldout.Row(query, returned, query.kind() != CurriculumHoldout.Kind.POSITIVE && returned.isEmpty(), 0, 1);
    }

    private static CurriculumRAGService.RetrievedChunk chunk(String id) {
        return new CurriculumRAGService.RetrievedChunk(id, com.aigameplatform.backend.entity.enums.Subject.MATH,
                com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, "topic", "text", 0.9,
                "source.pdf", List.of(188), List.of(22), "32/2018/TT-BGDDT");
    }
}
