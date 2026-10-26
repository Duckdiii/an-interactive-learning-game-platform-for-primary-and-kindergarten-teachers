package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumEvidenceCompositionTest {
    private final CurriculumEvidenceVerifier verifier = new CurriculumEvidenceVerifier();

    @Test
    void mapsEachPartOfAProgramSupportedCompoundRequestToItsOwnOutcome() throws IOException {
        var englishGradeOne = dataset(Subject.ENGLISH, GradeLevel.GRADE_1);
        var listening = outcome(englishGradeOne, text -> plain(text).contains("nghe cac chu cai"));
        var tracing = outcome(englishGradeOne, text -> plain(text).contains("chep lai chu cai trong tu"));
        String listeningCondition = "Nhan biet cac chu cai qua viec nghe "
                + listening.text().substring(listening.text().indexOf(' ') + 1);
        String tracingCondition = "Luyen tap: " + tracing.text();
        String request = listeningCondition + "; " + tracingCondition;

        var decision = verifier.verify(request, Subject.ENGLISH, GradeLevel.GRADE_1,
                List.of(retrieved(englishGradeOne, listening), retrieved(englishGradeOne, tracing)));

        assertThat(decision.supported()).isTrue();
        assertThat(decision.supportingChunkIds()).containsExactlyInAnyOrder(listening.chunkId(), tracing.chunkId());
        assertThat(decision.evidenceSupports()).containsExactlyInAnyOrder(
                new CurriculumEvidenceVerifier.EvidenceSupport(listeningCondition, listening.chunkId(), listening.text()),
                new CurriculumEvidenceVerifier.EvidenceSupport(tracingCondition, tracing.chunkId(), tracing.text()));
    }

    @Test
    void doesNotUseAnOutcomeFromAnotherSubjectToCompleteACompoundRequest() throws IOException {
        var englishGradeOne = dataset(Subject.ENGLISH, GradeLevel.GRADE_1);
        var mathGradeThree = dataset(Subject.MATH, GradeLevel.GRADE_3);
        var listening = outcome(englishGradeOne, text -> plain(text).contains("nghe cac chu cai"));
        var perimeter = outcome(mathGradeThree, text -> plain(text).contains("chu vi") && plain(text).contains("hinh vuong"));
        String listeningCondition = "Nhan biet cac chu cai qua viec nghe "
                + listening.text().substring(listening.text().indexOf(' ') + 1);
        String perimeterCondition = "Tinh chu vi: " + perimeter.text();

        var decision = verifier.verify(listeningCondition + "; " + perimeterCondition,
                Subject.ENGLISH, GradeLevel.GRADE_1,
                List.of(retrieved(englishGradeOne, listening), retrieved(mathGradeThree, perimeter)));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.supportingChunkIds()).isEmpty();
        assertThat(decision.evidenceSupports()).containsExactly(
                new CurriculumEvidenceVerifier.EvidenceSupport(listeningCondition, listening.chunkId(), listening.text()));
    }

    @Test
    void doesNotJoinRelatedSubjectChunksWhenOneRequestedSkillOrShapeIsUnsupported() throws IOException {
        var mathGradeThree = dataset(Subject.MATH, GradeLevel.GRADE_3);
        var rounding = outcome(mathGradeThree, text -> plain(text).contains("lam tron")
                && plain(text).contains("tron nghin"));
        var area = outcome(mathGradeThree, text -> plain(text).contains("dien tich")
                && plain(text).contains("hinh chu nhat"));
        String roundingCondition = "Lam tron toi hang nghin";
        String unsupportedAreaCondition = "Tinh dien tich hinh tam giac";

        var decision = verifier.verify(roundingCondition + "; " + unsupportedAreaCondition,
                Subject.MATH, GradeLevel.GRADE_3,
                List.of(retrieved(mathGradeThree, rounding), retrieved(mathGradeThree, area)));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.supportingChunkIds()).isEmpty();
        assertThat(decision.evidenceSupports()).containsExactly(
                new CurriculumEvidenceVerifier.EvidenceSupport(roundingCondition, rounding.chunkId(), rounding.text()));
    }

    @Test
    void acceptsParaphrasesDerivedFromCurrentMathAndLanguageOutcomes() throws IOException {
        var cases = List.of(
                sourceCase(Subject.MATH, GradeLevel.GRADE_1,
                        text -> plain(text).contains("khong nho") && plain(text).contains("pham vi 100"),
                        "100", "mot tram"),
                sourceCase(Subject.MATH, GradeLevel.GRADE_1,
                        text -> plain(text).contains("tru nham") && plain(text).contains("pham vi 10"),
                        "10", "muoi"),
                sourceCase(Subject.MATH, GradeLevel.GRADE_1,
                        text -> plain(text).contains("doc") && plain(text).contains("viet")
                                && plain(text).contains("pham vi 100"),
                        "100", "mot tram"),
                sourceCase(Subject.MATH, GradeLevel.GRADE_2,
                        text -> plain(text).contains("co nho khong qua mot luot") && plain(text).contains("1000"),
                        "1000", "mot nghin"),
                sourceCase(Subject.MATH, GradeLevel.GRADE_2,
                        text -> plain(text).contains("kim phut chi so 3") && plain(text).contains("so 6"),
                        "6", "sau"),
                sourceCase(Subject.MATH, GradeLevel.GRADE_3,
                        text -> plain(text).contains("phep chia cho so co mot chu so"),
                        "", ""),
                sourceCase(Subject.MATH, GradeLevel.GRADE_3,
                        text -> plain(text).contains("chu vi") && plain(text).contains("hinh tam giac")
                                && plain(text).contains("hinh vuong"),
                        "", "")
        );
        for (var testCase : cases) {
            var decision = verifier.verify(testCase.query(), testCase.subject(), testCase.grade(),
                    List.of(retrieved(testCase.dataset(), testCase.outcome())));
            assertThat(decision.supported()).as("decision=%s source=%s query=%s", decision,
                    testCase.outcome().text(), testCase.query()).isTrue();
            assertThat(decision.evidenceSupports()).isNotEmpty().allSatisfy(support -> {
                assertThat(support.chunkId()).isEqualTo(testCase.outcome().chunkId());
                assertThat(support.outcomeText()).isEqualTo(testCase.outcome().text());
                assertThat(testCase.query()).contains(support.requestedCondition());
            });
        }
    }

    @Test
    void acceptsCorrectScopeParaphrasesForEveryVietnameseAndEnglishGrade() throws IOException {
        for (var subject : List.of(Subject.VIETNAMESE, Subject.ENGLISH)) {
            for (int grade = 1; grade <= 5; grade++) {
                GradeLevel selected = GradeLevel.valueOf("GRADE_" + grade);
                var dataset = dataset(subject, selected);
                var sourceOutcome = dataset.chunks().stream().filter(chunk -> !chunk.control()).findFirst().orElseThrow();
                String request = sourceOutcome.topic().replace(" / ", " ") + " practice grade " + grade;
                var retrieved = retrieved(dataset, sourceOutcome);

                var decision = verifier.verify(request, subject, selected, List.of(retrieved));

                assertThat(decision.supported()).as("subject=%s grade=%s source=%s", subject, selected,
                        sourceOutcome.text()).isTrue();
                assertThat(decision.evidenceSupports()).anySatisfy(support -> {
                    assertThat(support.chunkId()).isEqualTo(sourceOutcome.chunkId());
                    assertThat(support.outcomeText()).isEqualTo(sourceOutcome.text());
                });
                GradeLevel other = selected == GradeLevel.GRADE_1 ? GradeLevel.GRADE_2 : GradeLevel.GRADE_1;
                String wrongScopeRequest = request + " lớp " + other.name().substring("GRADE_".length());
                assertThat(verifier.verify(wrongScopeRequest, subject, selected, List.of(retrieved)).supported())
                        .as("reject explicit mismatched grade for %s/%s", subject, selected).isFalse();
            }
        }
    }

    @Test
    void doesNotMistakeOutsideTheClassroomForAnOutOfScopeGrade() throws IOException {
        var englishGradeFive = dataset(Subject.ENGLISH, GradeLevel.GRADE_5);
        var speaking = outcome(englishGradeFive, text -> plain(text).contains("chi dan")
                && plain(text).contains("ngoai lop hoc"));
        String request = speaking.text().replace(";", ",") + " practice grade 5";

        var decision = verifier.verify(request, Subject.ENGLISH, GradeLevel.GRADE_5,
                List.of(retrieved(englishGradeFive, speaking)));

        assertThat(decision.supported()).isTrue();
        assertThat(decision.evidenceSupports()).containsExactly(
                new CurriculumEvidenceVerifier.EvidenceSupport(request, speaking.chunkId(), speaking.text()));
    }

    @Test
    void acceptsTheSourceSupportedOrderOfOperationsParaphrase() throws IOException {
        var mathGradeThree = dataset(Subject.MATH, GradeLevel.GRADE_3);
        var query = CurriculumEvaluation.loadQueries(Subject.MATH, GradeLevel.GRADE_3).stream()
                .filter(item -> !item.negative() && plain(item.topic()).contains("ngoac")
                        && item.expectedChunkIds().stream().anyMatch(id -> mathGradeThree.chunks().stream()
                        .anyMatch(chunk -> chunk.chunkId().equals(id)
                                && plain(chunk.text()).contains("trong dau ngoac truoc"))))
                .findFirst().orElseThrow();
        var expressions = mathGradeThree.chunks().stream()
                .filter(chunk -> query.expectedChunkIds().contains(chunk.chunkId()))
                .findFirst().orElseThrow();

        var decision = verifier.verify(query.topic(),
                Subject.MATH, GradeLevel.GRADE_3, List.of(retrieved(mathGradeThree, expressions)));

        assertThat(decision.supported()).as("decision=%s query=%s", decision, query.topic()).isTrue();
        assertThat(decision.evidenceSupports()).containsExactly(
                new CurriculumEvidenceVerifier.EvidenceSupport(query.topic(), expressions.chunkId(), expressions.text()));
    }

    @Test
    void doesNotTreatARequestForPercentAsSupportedByFractionProblemSolving() throws IOException {
        var mathGradeFour = dataset(Subject.MATH, GradeLevel.GRADE_4);
        var fractions = outcome(mathGradeFour, text -> plain(text).contains("4 phep tinh voi phan so")
                && plain(text).contains("tim phan so cua mot so"));

        var decision = verifier.verify("Tính phần trăm số học sinh tham gia hoạt động",
                Subject.MATH, GradeLevel.GRADE_4, List.of(retrieved(mathGradeFour, fractions)));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.supportingChunkIds()).isEmpty();
        assertThat(decision.constraints()).contains("math-concept:percentage");

        var mathGradeFive = dataset(Subject.MATH, GradeLevel.GRADE_5);
        var percentage = outcome(mathGradeFive, text -> plain(text).contains("gia tri phan tram")
                && plain(text).contains("so cho truoc"));
        assertThat(verifier.verify("Tìm giá trị phần trăm của một số cho trước", Subject.MATH,
                GradeLevel.GRADE_5, List.of(retrieved(mathGradeFive, percentage))).supported()).isTrue();
    }

    @Test
    void doesNotInferAnUnstatedFormulaFromTheBroadCircleAreaOutcome() throws IOException {
        var mathGradeFive = dataset(Subject.MATH, GradeLevel.GRADE_5);
        var circleArea = outcome(mathGradeFive, text -> plain(text).contains("chu vi")
                && plain(text).contains("dien tich hinh tron"));

        var broadRequest = verifier.verify("Tính diện tích hình tròn", Subject.MATH, GradeLevel.GRADE_5,
                List.of(retrieved(mathGradeFive, circleArea)));
        var formulaRequest = verifier.verify("Tính diện tích hình tròn theo công thức pi nhân bán kính bình phương",
                Subject.MATH, GradeLevel.GRADE_5, List.of(retrieved(mathGradeFive, circleArea)));

        assertThat(broadRequest.supported()).isTrue();
        assertThat(formulaRequest.supported()).isFalse();
        assertThat(formulaRequest.supportingChunkIds()).isEmpty();
        assertThat(formulaRequest.constraints()).contains("method:formula-details");
        var explicitFormula = new CurriculumRAGService.RetrievedChunk("formula-fixture", Subject.MATH,
                GradeLevel.GRADE_5, "Đo lường / Tính toán",
                "Tính được diện tích hình tròn theo công thức pi nhân bán kính bình phương.",
                0.9, "source.pdf", List.of(210), List.of(44), "32/2018/TT-BGDDT");
        assertThat(verifier.verify("Tính diện tích hình tròn theo công thức pi nhân bán kính bình phương",
                Subject.MATH, GradeLevel.GRADE_5, List.of(explicitFormula)).supported()).isTrue();
    }

    @Test
    void doesNotTreatRecognizingTriangleTypesAsEvidenceForAProofSkill() throws IOException {
        var mathGradeFive = dataset(Subject.MATH, GradeLevel.GRADE_5);
        var recognition = outcome(mathGradeFive, text -> plain(text).contains("nhan biet duoc")
                && plain(text).contains("mot so loai hinh tam giac"));

        var recognizeRequest = verifier.verify("Nhận biết tam giác vuông và tam giác đều",
                Subject.MATH, GradeLevel.GRADE_5, List.of(retrieved(mathGradeFive, recognition)));
        var proofRequest = verifier.verify("Chứng minh tính đồng dạng của hai tam giác qua góc tương ứng",
                Subject.MATH, GradeLevel.GRADE_5, List.of(retrieved(mathGradeFive, recognition)));

        assertThat(recognizeRequest.supported()).isTrue();
        assertThat(proofRequest.supported()).isFalse();
        assertThat(proofRequest.supportingChunkIds()).isEmpty();
        assertThat(proofRequest.constraints()).contains("skill:proof", "math-concept:similarity");
    }

    @Test
    void requiresOneOutcomeToCoverTheRequestedActionAndTopicForLanguageQuestions() throws IOException {
        for (var grade : List.of(GradeLevel.GRADE_3, GradeLevel.GRADE_4)) {
            var english = dataset(Subject.ENGLISH, grade);
            var query = CurriculumEvaluation.loadQueries(Subject.ENGLISH, grade).stream()
                    .filter(item -> !item.negative() && plain(item.topic()).contains("tra loi")
                            && plain(item.topic()).contains("chu de quen thuoc"))
                    .filter(item -> item.expectedChunkIds().stream().anyMatch(id -> english.chunks().stream()
                            .filter(chunk -> chunk.chunkId().equals(id))
                            .anyMatch(chunk -> plain(chunk.text()).contains("tra loi")
                                    && plain(chunk.text()).contains("chu de quen thuoc"))))
                    .findFirst().orElseThrow();
            var expected = english.chunks().stream()
                    .filter(chunk -> query.expectedChunkIds().contains(chunk.chunkId()))
                    .findFirst().orElseThrow();
            var questionsOnly = outcome(english, text -> plain(text).contains("tra loi")
                    && plain(text).contains("cau hoi") && !plain(text).contains("chu de quen thuoc"));
            var familiarTopicsOnly = outcome(english, text -> plain(text).contains("noi ve")
                    && plain(text).contains("chu de quen thuoc") && !plain(text).contains("tra loi"));

            assertThat(verifier.verify(query.topic(), Subject.ENGLISH, grade,
                    List.of(retrieved(english, expected))).supportingChunkIds())
                    .as("direct source outcome for %s", grade).contains(expected.chunkId());
            assertThat(verifier.verify(query.topic(), Subject.ENGLISH, grade,
                    List.of(retrieved(english, questionsOnly))).supported())
                    .as("question-only outcome for %s", grade).isFalse();
            assertThat(verifier.verify(query.topic(), Subject.ENGLISH, grade,
                    List.of(retrieved(english, familiarTopicsOnly))).supported())
                    .as("topic-only outcome for %s", grade).isFalse();
        }
    }

    @Test
    void rejectsPartialEvidenceForVietnameseCommaAndConjunctionLists() throws IOException {
        var mathGradeThree = dataset(Subject.MATH, GradeLevel.GRADE_3);
        var query = CurriculumEvaluation.loadQueries(Subject.MATH, GradeLevel.GRADE_3).stream()
                .filter(item -> item.queryId().equals("q08")).findFirst().orElseThrow();
        var candidates = mathGradeThree.chunks().stream()
                .filter(chunk -> query.expectedChunkIds().contains(chunk.chunkId()))
                .map(chunk -> retrieved(mathGradeThree, chunk)).toList();

        var partial = verifier.verify(query.topic(), Subject.MATH, GradeLevel.GRADE_3,
                List.of(candidates.getFirst()));
        var missingAngle = verifier.verify(query.topic(), Subject.MATH, GradeLevel.GRADE_3,
                List.of(candidates.getLast()));
        var complete = verifier.verify(query.topic(), Subject.MATH, GradeLevel.GRADE_3, candidates);

        assertThat(partial.supported()).isFalse();
        assertThat(partial.supportingChunkIds()).isEmpty();
        assertThat(missingAngle.supported()).isFalse();
        assertThat(missingAngle.supportingChunkIds()).isEmpty();
        assertThat(complete.supported()).isTrue();
        assertThat(complete.supportingChunkIds()).containsExactlyInAnyOrderElementsOf(query.expectedChunkIds());
    }

    @Test
    void acceptsAConjunctiveReadAndWriteRequestWhenOneOutcomeSupportsBoth() throws IOException {
        var mathGradeOne = dataset(Subject.MATH, GradeLevel.GRADE_1);
        var query = CurriculumEvaluation.loadQueries(Subject.MATH, GradeLevel.GRADE_1).stream()
                .filter(item -> item.queryId().equals("q02")).findFirst().orElseThrow();
        var outcome = mathGradeOne.chunks().stream()
                .filter(chunk -> query.expectedChunkIds().contains(chunk.chunkId())).findFirst().orElseThrow();

        var decision = verifier.verify(query.topic(), Subject.MATH, GradeLevel.GRADE_1,
                List.of(retrieved(mathGradeOne, outcome)));

        assertThat(decision.supported()).isTrue();
        assertThat(decision.supportingChunkIds()).containsExactly(outcome.chunkId());
    }

    @Test
    void rejectsPositiveCarryEvidenceForAnExplicitNoCarryRequest() throws IOException {
        var mathGradeThree = dataset(Subject.MATH, GradeLevel.GRADE_3);
        var positiveCarry = outcome(mathGradeThree, text -> plain(text).contains("co nho khong qua hai luot"));

        var decision = verifier.verify("Cộng không cần nhớ với số có đến 5 chữ số", Subject.MATH,
                GradeLevel.GRADE_3, List.of(retrieved(mathGradeThree, positiveCarry)));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.supportingChunkIds()).isEmpty();
        assertThat(decision.constraints()).contains("carry:false");
    }

    private static SourceCase sourceCase(Subject subject, GradeLevel grade, java.util.function.Predicate<String> predicate,
                                         String oldTail, String newTail) throws IOException {
        var dataset = dataset(subject, grade);
        var outcome = outcome(dataset, predicate);
        String query = oldTail.isEmpty() ? outcome.text() : replaceLast(outcome.text(), oldTail, newTail);
        return new SourceCase(subject, grade, dataset, outcome, query);
    }

    private static CurriculumDataset dataset(Subject subject, GradeLevel grade) throws IOException {
        return CurriculumDataset.loadAllReviewed().stream()
                .filter(dataset -> dataset.chunks().stream().anyMatch(chunk -> !chunk.control()
                        && chunk.subject() == subject && chunk.gradeLevel() == grade))
                .findFirst().orElseThrow();
    }

    private static CurriculumChunk outcome(CurriculumDataset dataset, java.util.function.Predicate<String> predicate) {
        return dataset.chunks().stream().filter(chunk -> !chunk.control() && predicate.test(chunk.text()))
                .findFirst().orElseThrow(() -> new AssertionError("Expected source-backed outcome was not found"));
    }

    private static CurriculumRAGService.RetrievedChunk retrieved(CurriculumDataset dataset, CurriculumChunk chunk) {
        return new CurriculumRAGService.RetrievedChunk(chunk.chunkId(), chunk.subject(), chunk.gradeLevel(),
                chunk.topic(), chunk.text(), 0.9, dataset.source().sourceDocument(),
                chunk.sourceFragments().stream().map(CurriculumChunk.SourceFragment::pdfPage).distinct().toList(),
                chunk.sourceFragments().stream().map(CurriculumChunk.SourceFragment::printedPage).distinct().toList(),
                dataset.source().curriculumVersion());
    }

    private static String replaceLast(String text, String oldValue, String newValue) {
        int index = text.lastIndexOf(oldValue);
        return index < 0 ? text : text.substring(0, index) + newValue + text.substring(index + oldValue.length());
    }

    private static String plain(String text) {
        return java.text.Normalizer.normalize(text.toLowerCase(java.util.Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replace('đ', 'd').replaceAll("\\p{M}+", "");
    }

    private record SourceCase(Subject subject, GradeLevel grade, CurriculumDataset dataset,
                              CurriculumChunk outcome, String query) {}
}
