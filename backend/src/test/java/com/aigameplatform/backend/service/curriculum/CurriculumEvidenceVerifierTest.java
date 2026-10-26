package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumEvidenceVerifierTest {
    private final CurriculumEvidenceVerifier verifier = new CurriculumEvidenceVerifier();

    @Test
    void acceptsCurriculumSupportedLimitsAndRejectsAdjacentUnsupportedClaimsForEveryRule() {
        var cases = List.of(
                pair("grade-scope", "Phép tính lớp 3", "Thực hiện được phép chia cho số có một chữ số.", 3),
                pair("grade-scope", "Yêu cầu lớp kế tiếp ngoài lớp đang chọn", "Thực hiện được phép chia cho số có một chữ số.", 3, false),
                pair("digit-count", "Chia số có hai chữ số", "Thực hiện được phép chia cho số có không quá hai chữ số.", 4),
                pair("digit-count", "Chia số có ba chữ số", "Thực hiện được phép chia cho số có không quá hai chữ số.", 4, false),
                pair("operation-count", "Biểu thức có hai dấu phép tính", "Tính được giá trị của biểu thức số có đến hai dấu phép tính và không có dấu ngoặc.", 3),
                pair("operation-count", "Biểu thức có ba dấu phép tính", "Tính được giá trị của biểu thức số có đến hai dấu phép tính và không có dấu ngoặc.", 3, false),
                pair("carry", "Cộng có nhớ", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", 3),
                pair("carry", "Cộng không nhớ", "Thực hiện được phép cộng, phép trừ (không nhớ, có nhớ không quá một lượt) các số trong phạm vi 1000.", 2),
                pair("carry", "Cộng có nhớ", "Thực hiện được phép cộng, phép trừ (không nhớ) các số trong phạm vi 100.", 1, false),
                pair("carry", "Cộng không nhớ", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", 3, false),
                pair("carry-turn-limit", "Cộng có nhớ hai lượt", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", 3),
                pair("carry-turn-limit", "Cộng có nhớ ba lượt", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", 3, false),
                pair("carry-turn-sequence", "Cộng có nhớ hai lượt không liên tiếp", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", 3),
                pair("carry-turn-sequence", "Cộng có nhớ hai lượt liên tiếp", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", 3, false),
                pair("numeric-boundary", "Đọc số trong phạm vi 100", "Đếm, đọc, viết được các số trong phạm vi 10; trong phạm vi 20; trong phạm vi 100.", 1),
                pair("numeric-boundary", "Đọc số trong phạm vi 101", "Đếm, đọc, viết được các số trong phạm vi 10; trong phạm vi 20; trong phạm vi 100.", 1, false),
                pair("minute-position", "Đọc giờ khi kim phút chỉ số 6", "Đọc được giờ trên đồng hồ khi kim phút chỉ số 3, số 6.", 2),
                pair("minute-position", "Đọc giờ với kim phút ở vị trí số 9", "Đọc được giờ trên đồng hồ khi kim phút chỉ số 3, số 6.", 2, false),
                pair("shape", "Nhận dạng hình vuông", "Nhận dạng được hình vuông, hình tròn, hình tam giác, hình chữ nhật thông qua việc sử dụng bộ đồ dùng học tập cá nhân hoặc vật thật.", 1),
                pair("shape", "Nhận dạng hình ngũ giác", "Nhận dạng được hình vuông, hình tròn, hình tam giác, hình chữ nhật thông qua việc sử dụng bộ đồ dùng học tập cá nhân hoặc vật thật.", 1, false),
                pair("rounding", "Làm tròn số đến hàng nghìn", "Làm quen với việc làm tròn số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn.", 3),
                pair("rounding", "Làm tròn số đến hàng triệu", "Làm quen với việc làm tròn số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn.", 3, false),
                pair("area", "Tính diện tích hình chữ nhật", "Tính được diện tích hình chữ nhật, hình vuông.", 3),
                pair("area", "Tính diện tích hình tam giác", "Tính được chu vi của hình tam giác, hình tứ giác, hình chữ nhật, hình vuông khi biết độ dài các cạnh.", 3, false),
                pair("area-shape-pair", "Tính diện tích hình chữ nhật", "Tính được diện tích hình chữ nhật, hình vuông.", 3),
                pair("area-shape-pair", "Tính diện tích hình tam giác", "Tính được diện tích hình chữ nhật, hình vuông. || Tính được chu vi của hình tam giác, hình tứ giác, hình chữ nhật, hình vuông khi biết độ dài các cạnh.", 3, false),
                pair("multiplication-table", "Học bảng nhân 8", "Vận dụng được các bảng nhân, bảng chia 2, 3,..., 9 trong thực hành tính.", 3),
                pair("multiplication-table", "Học bảng nhân 10", "Vận dụng được các bảng nhân, bảng chia 2, 3,..., 9 trong thực hành tính.", 3, false),
                pair("place-value", "Làm tròn đến hàng trăm nghìn", "Làm tròn được số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn, tròn trăm nghìn.", 4),
                pair("place-value", "Làm tròn đến hàng triệu", "Làm tròn được số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn, tròn trăm nghìn.", 4, false)
        );

        int falseBlocks = 0;
        int falseAccepts = 0;
        for (var testCase : cases) {
            boolean actual = verifier.verify(testCase.query(), java.util.Arrays.stream(testCase.evidence().split(" \\|\\| "))
                    .map(text -> chunk(text, testCase.gradeLevel()))
                    .toList()).supported();
            if (testCase.expectedSupported() && !actual) falseBlocks++;
            if (!testCase.expectedSupported() && actual) falseAccepts++;
            assertThat(actual).as("rule=%s grade=%s query=%s evidence=%s", testCase.rule(),
                    testCase.gradeLevel(), testCase.query(), testCase.evidence()).isEqualTo(testCase.expectedSupported());
        }
        assertThat(cases).hasSize(30);
        assertThat(cases.stream().filter(EvidencePair::expectedSupported).count()).isEqualTo(15);
        assertThat(cases.stream().filter(testCase -> !testCase.expectedSupported()).count()).isEqualTo(15);
        assertThat(falseBlocks).as("false blocks on source-supported boundary cases").isZero();
        assertThat(falseAccepts).as("false accepts on adjacent unsupported claims").isZero();
    }

    @Test
    void rejectsAOneDigitOutcomeForARequestAboutTwoDigitDivisors() {
        var decision = verifier.verify("Tìm thương với số chia gồm hai chữ số",
                List.of(chunk("Thực hiện được phép chia cho số có một chữ số.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("UNSUPPORTED_EXPLICIT_CONSTRAINT");
        assertThat(decision.constraints()).contains("digit-count:2");
    }

    @Test
    void acceptsAnOutcomeThatStatesTheRequestedDigitCountUsingDifferentSurroundingWords() {
        var decision = verifier.verify("Chia số có hai chữ số",
                List.of(chunk("Thực hiện phép chia cho các số chia gồm hai chữ số.")));

        assertThat(decision.supported()).isTrue();
    }

    @Test
    void acceptsACurriculumSupportedFractionListWithoutReadingItsRangeAsAnIntegerBound() {
        var decision = verifier.verify("Nhận biết một phần hai, một phần ba đến một phần chín",
                List.of(chunk("Nhận biết được 1/2; 1/3;...;1/9 thông qua các hình ảnh trực quan.")));

        assertThat(decision.supported()).isTrue();
    }

    @Test
    void rejectsAnOutcomeAboutOtherShapesForACircleCircumferenceRequest() {
        var decision = verifier.verify("Tính chu vi đường tròn",
                List.of(chunk("Tính được chu vi của hình tam giác, hình tứ giác, hình chữ nhật, hình vuông.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("shape:circle");
    }

    @Test
    void rejectsEvidenceFromTheRequestedGradeWhenTheTeacherAsksForAnAdjacentGrade() {
        var decision = verifier.verify("Yêu cầu cần đạt của lớp kế tiếp, ngoài khối đang chọn",
                List.of(chunk("Đọc thầm với tốc độ nhanh hơn lớp 2.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("REQUESTED_SCOPE_MISMATCH");
    }

    @Test
    void rejectsARequestedCarryingOperationWhenRetrievedOutcomesOnlySayWithoutCarrying() {
        var decision = verifier.verify("Cộng có nhớ trong khoảng một trăm",
                List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ các số trong phạm vi 100.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("carry:true");
    }

    @Test
    void doesNotCombineCarryAndNumericRangeFromDifferentOutcomesInACompoundRequest() {
        var decision = verifier.verify("Cộng có nhớ và trong phạm vi 100", List.of(
                chunk("Thực hiện phép cộng có nhớ các số trong phạm vi 10."),
                chunk("Thực hiện phép cộng không nhớ các số trong phạm vi 100.")));
        var toBoundary = verifier.verify("Cộng có nhớ và đến 100", List.of(
                chunk("Thực hiện phép cộng có nhớ các số trong phạm vi 10."),
                chunk("Thực hiện phép cộng không nhớ các số trong phạm vi 100.")));
        var coherent = verifier.verify("Cộng có nhớ và trong phạm vi 1000", List.of(
                chunk("Thực hiện phép cộng, phép trừ (không nhớ, có nhớ không quá một lượt) các số trong phạm vi 1000.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.supportingChunkIds()).isEmpty();
        assertThat(decision.constraints()).contains("linked-constraints-not-supported-by-single-outcome");
        assertThat(toBoundary.supported()).isFalse();
        assertThat(toBoundary.supportingChunkIds()).isEmpty();
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void doesNotCombineCarryAndTurnLimitFromDifferentOutcomes() {
        var split = verifier.verify("Cong co nho \u0076\u00e0 toi da hai luot", List.of(
                chunk("Thuc hien phep cong co nho."),
                chunk("Tro choi toan hoc khong qua hai luot.")));
        var coherent = verifier.verify("Cong co nho \u0076\u00e0 toi da hai luot", List.of(
                chunk("Thuc hien phep cong co nho khong qua hai luot.")));

        assertThat(split.supported()).isFalse();
        assertThat(split.supportingChunkIds()).isEmpty();
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void doesNotCombineRoundingSkillAndRequestedPlaceFromDifferentOutcomes() {
        var split = verifier.verify("Lam tron so \u0076\u00e0 den hang nghin", List.of(
                chunk("Lam tron so den hang tram."),
                chunk("Doc so den hang nghin.")));
        var coherent = verifier.verify("Lam tron so \u0076\u00e0 den hang nghin", List.of(
                chunk("Lam tron so den hang nghin.")));

        assertThat(split.supported()).isFalse();
        assertThat(split.supportingChunkIds()).isEmpty();
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void doesNotAcceptACompoundReadAndWriteRequestFromReadOnlyEvidence() {
        var partial = verifier.verify("Đọc \u0076\u00e0 viết số trong phạm vi 100",
                List.of(chunk("Đọc số trong phạm vi 100.")));
        var commaSeparatedPartial = verifier.verify("Đọc, viết số trong phạm vi 100",
                List.of(chunk("Đọc số trong phạm vi 100.")));
        var memorizationOnly = verifier.verify("Đọc, viết số trong phạm vi 100",
                List.of(chunk("Đọc số và ghi nhớ số trong phạm vi 100.")));
        var coherent = verifier.verify("Đọc \u0076\u00e0 viết số trong phạm vi 100",
                List.of(chunk("Đọc, viết số trong phạm vi 100.")));

        assertThat(partial.supported()).isFalse();
        assertThat(partial.supportingChunkIds()).isEmpty();
        assertThat(commaSeparatedPartial.supported()).isFalse();
        assertThat(commaSeparatedPartial.supportingChunkIds()).isEmpty();
        assertThat(memorizationOnly.supported()).isFalse();
        assertThat(memorizationOnly.supportingChunkIds()).isEmpty();
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void doesNotTreatSubjectNameOrIndependentWorkAsAReadOrWriteAction() {
        var vietnameseSubject = verifier.verify("Tìm hiểu yêu cầu cần đạt Tiếng Việt lớp 1",
                List.of(chunk("Nghe hiểu khi giao tiếp trong các tình huống quen thuộc.")));
        var independentWork = verifier.verify("Làm việc độc lập theo hướng dẫn",
                List.of(chunk("Hoàn thành nhiệm vụ một mình theo hướng dẫn.")));
        var subjectAndExplicitWriting = verifier.verify("Tiếng Việt: đọc và viết", Subject.VIETNAMESE,
                GradeLevel.GRADE_1, List.of(chunk(Subject.VIETNAMESE, "Đọc hiểu tiếng Việt.")));

        assertThat(vietnameseSubject.supported()).isTrue();
        assertThat(independentWork.supported()).isTrue();
        assertThat(subjectAndExplicitWriting.supported()).isFalse();
    }

    @Test
    void doesNotCombineDigitWidthAndNumericRangeFromDifferentOutcomes() {
        var split = verifier.verify("Chia số có hai chữ số \u0076\u00e0 trong phạm vi 1000", List.of(
                chunk("Thực hiện phép chia cho số có hai chữ số."),
                chunk("Chia các số có một chữ số trong phạm vi 1000.")));
        var coherent = verifier.verify("Chia số có hai chữ số \u0076\u00e0 trong phạm vi 1000",
                List.of(chunk("Chia các số có hai chữ số trong phạm vi 1000.")));

        assertThat(split.supported()).isFalse();
        assertThat(split.supportingChunkIds()).isEmpty();
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void doesNotCombineOperationCountAndNumericRangeFromDifferentOutcomes() {
        var split = verifier.verify("Biểu thức có ba dấu phép tính \u0076\u00e0 trong phạm vi 1000", List.of(
                chunk("Tính được biểu thức số có ba dấu phép tính."),
                chunk("Tính các biểu thức trong phạm vi 1000.")));
        var coherent = verifier.verify("Biểu thức có ba dấu phép tính \u0076\u00e0 trong phạm vi 1000",
                List.of(chunk("Tính biểu thức số có ba dấu phép tính trong phạm vi 1000.")));

        assertThat(split.supported()).isFalse();
        assertThat(split.supportingChunkIds()).isEmpty();
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void doesNotCombineAreaOfOneShapeWithAnotherShapesPerimeter() {
        var rectangleArea = new CurriculumRAGService.RetrievedChunk("rectangle-area", Subject.MATH,
                GradeLevel.GRADE_1, "measurement", "Tính diện tích hình chữ nhật.", 0.9,
                "source.pdf", List.of(1), List.of(1), "32/2018/TT-BGDGDT");
        var trianglePerimeter = new CurriculumRAGService.RetrievedChunk("triangle-perimeter", Subject.MATH,
                GradeLevel.GRADE_1, "geometry", "Tính chu vi hình tam giác.", 0.9,
                "source.pdf", List.of(1), List.of(1), "32/2018/TT-BGDGDT");

        var decision = verifier.verify("Tính diện tích hình chữ nhật và hình tam giác",
                List.of(rectangleArea, trianglePerimeter));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.supportingChunkIds()).isEmpty();
        assertThat(decision.constraints()).contains("linked-constraints-not-supported-by-single-outcome");

        var coherent = verifier.verify("Tính diện tích hình chữ nhật và hình vuông",
                List.of(chunk("Tính được diện tích hình chữ nhật, hình vuông.")));
        assertThat(coherent.supported()).isTrue();
    }

    @Test
    void rejectsARequestedClockPositionThatTheOutcomeDoesNotSpecify() {
        var decision = verifier.verify("Kim phút đang chỉ số 9, hãy đọc giờ.",
                List.of(chunk("Đọc được giờ trên đồng hồ khi kim phút chỉ số 3, số 6.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("minute-position:9");
    }

    @Test
    void rejectsRoundingToThousandsWhenTheRetrievedOutcomeOnlyMentionsRoundHundreds() {
        var decision = verifier.verify("Yêu cầu làm tròn đến hàng nghìn cho bài Toán lớp 2",
                List.of(chunk("Nhận biết được số tròn trăm."), chunk("Đếm, đọc, viết số trong phạm vi 1000.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("skill:rounding");
    }

    @Test
    void rejectsAPlaceValueMismatchEvenWhenBothOutcomesMentionRounding() {
        var decision = verifier.verify("Làm tròn số đến hàng nghìn",
                List.of(chunk("Làm tròn số đến hàng trăm.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("place-value:hang-nghin");
    }

    @Test
    void preservesOrdinaryRelevantRetrievalWhenTheQueryHasNoExplicitConstraintToCheck() {
        var decision = verifier.verify("Tìm hiểu phép chia trong Toán lớp 3",
                List.of(chunk("Thực hiện được phép chia cho số có một chữ số.")));

        assertThat(decision.supported()).isTrue();
        assertThat(decision.constraints()).isEmpty();
    }

    @Test
    void rejectsMultipleCarryingTurnsWhenTheOutcomeCapsItAtOne() {
        var decision = verifier.verify("Thực hiện phép cộng có nhớ hai lượt, đến 1000",
                List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ hoặc có nhớ không quá một lượt trong phạm vi 1000.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("carry-turn-limit:2>1");
    }

    @Test
    void rejectsNumbersAboveTheExplicitCurriculumRange() {
        var decision = verifier.verify("Liệt kê các số vượt quá 100",
                List.of(chunk("Đếm, đọc, viết được các số trong phạm vi 10, 20 và 100.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("numeric-boundary:greater-than-100");
    }

    @Test
    void rejectsANamedShapeMissingFromTheRetrievedOutcome() {
        var decision = verifier.verify("nhan dang hinh ngu giac bang vat that",
                List.of(chunk("nhan dang hinh vuong, hinh tron, hinh tam giac, hinh chu nhat.")));
        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("shape:pentagon");
    }

    @Test
    void rejectsMoreOperationSignsThanTheOutcomeNames() {
        var decision = verifier.verify("tinh bieu thuc co ba dau phep tinh lien tiep",
                List.of(chunk("lam quen voi tinh toan co hai dau phep tinh cong, tru theo thu tu trai sang phai.")));
        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("operation-count:3>2");
    }

    @Test
    void rejectsAMultiplicationTableThatTheOutcomeDoesNotList() {
        var decision = verifier.verify("hoc thuoc bang nhan 8",
                List.of(chunk("hoc thuoc bang nhan 2 va bang nhan 5.")));
        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("multiplication-table:8");
    }

    @Test
    void rejectsARequestedDigitWidthAboveTheOutcomeLimit() {
        var decision = verifier.verify("cong tru cac so co sau chu so",
                List.of(chunk("thuc hien phep cong, tru cac so co den 5 chu so.")));
        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("digit-count:6");
    }

    @Test
    void rejectsAnAreaRequestWhenEvidenceOnlySupportsPerimeter() {
        var decision = verifier.verify("tinh dien tich hinh tam giac",
                List.of(chunk("tinh duoc chu vi hinh tam giac, hinh tu giac, hinh chu nhat va hinh vuong.")));
        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("skill:area");
    }

    @Test
    void requiresTheRequestedShapeAndSkillToBeSupportedByTheSameOutcome() {
        var decision = verifier.verify("tinh dien tich hinh tam giac", List.of(
                chunk("tinh dien tich hinh chu nhat va hinh vuong."),
                chunk("tinh chu vi hinh tam giac va hinh tu giac.")));
        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("evidence-pair:area:triangle");
    }

    @Test
    void doesNotCombineCarryAndNumericLimitFromSeparateOutcomes() {
        var decision = verifier.verify("Cộng có nhớ trong phạm vi 100", List.of(
                chunk("Thực hiện phép cộng không nhớ các số trong phạm vi 100."),
                chunk("Thực hiện phép cộng có nhớ trong phạm vi 10.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("evidence-not-supported-by-single-outcome");
    }

    @Test
    void requiresEvidenceForEverySemicolonSeparatedCompoundCondition() {
        var decision = verifier.verify("Nhận dạng hình tròn; đọc giờ trên đồng hồ; đo độ dài bằng thước", Subject.MATH,
                GradeLevel.GRADE_1, List.of(chunk("Nhận dạng được hình vuông, hình tròn, hình tam giác, hình chữ nhật.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("UNSUPPORTED_COMPOUND_CONDITION");
        assertThat(decision.supportingChunkIds()).isEmpty();
    }

    @Test
    void acceptsTeacherNarrowingToMentalAdditionWithinTenWhenOutcomeAllowsWiderRange() {
        var decision = verifier.verify("Cộng không nhớ trong phạm vi 10",
                List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ các số trong phạm vi 100.")));

        assertThat(decision.supported()).isTrue();
    }

    @Test
    void acceptsAProgramSupportedNoCarryRequestWithinOneHundred() {
        var decision = verifier.verify("Cộng không nhớ đến 100",
                List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ các số trong phạm vi 100.")));

        assertThat(decision.supported()).isTrue();
    }

    @Test
    void acceptsAndRejectsDigitAndWrittenNumberVariantsConsistently() {
        var boundedOutcome = chunk("Đếm, đọc, viết được các số trong phạm vi 100.");

        assertThat(verifier.verify("Đọc và viết số trong phạm vi 100", List.of(boundedOutcome)).supported())
                .isTrue();
        assertThat(verifier.verify("Đọc và viết số trong phạm vi một trăm", List.of(boundedOutcome)).supported())
                .isTrue();
        assertThat(verifier.verify("Liệt kê các số vượt quá 100", List.of(boundedOutcome)).supported())
                .isFalse();
        assertThat(verifier.verify("Kể tên những số vượt quá một trăm", List.of(boundedOutcome)).supported())
                .isFalse();
    }

    @Test
    void rejectsAnExplicitGradeDifferentFromTheSelectedEnglishScope() {
        var decision = verifier.verify("Find English curriculum outcomes for grade two", Subject.ENGLISH,
                GradeLevel.GRADE_1, List.of(chunk(Subject.ENGLISH, "English learning outcome.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("REQUESTED_SCOPE_MISMATCH");
    }

    @Test
    void rejectsAVietnameseGradeWrittenAsAWordWhenItDiffersFromTheSelectedScope() {
        var decision = verifier.verify("Yêu cầu cần đạt Tiếng Việt lớp hai", Subject.VIETNAMESE,
                GradeLevel.GRADE_1, List.of(chunk(Subject.VIETNAMESE, "Đọc hiểu văn bản.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("REQUESTED_SCOPE_MISMATCH");
    }

    @Test
    void doesNotApplyMathematicsDigitRulesToEnglishOutcomes() {
        var decision = verifier.verify("Practice division with two-digit numbers", Subject.ENGLISH,
                GradeLevel.GRADE_1, List.of(chunk(Subject.ENGLISH, "Practice number names with two digits.")));

        assertThat(decision.supported()).isTrue();
    }

    @Test
    void rejectsGroupedThousandsBeyondTheOutcomeLimit() {
        var evidence = List.of(chunk("Thực hiện được phép cộng, phép trừ (không nhớ) các số trong phạm vi 100."));
        for (String bound : List.of("1000", "1.000", "10.000", "1 000", "1\u00a0000", "1\u202f000",
                "1000000000000", "1.000.000.000.000")) {
            var decision = verifier.verify("Phép cộng không nhớ trong phạm vi " + bound,
                    Subject.MATH, GradeLevel.GRADE_1, evidence);
            assertThat(decision.supported()).as("requested bound %s", bound).isFalse();
        }
    }

    @Test
    void acceptsGroupedThousandsWithinTheOutcomeLimit() {
        var evidence = List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ trong phạm vi 10.000.", 3));
        for (String bound : List.of("1000", "1.000", "1 000", "10.000")) {
            assertThat(verifier.verify("Phép cộng không nhớ trong phạm vi " + bound,
                    Subject.MATH, GradeLevel.GRADE_3, evidence).supported()).as("requested bound %s", bound).isTrue();
        }
    }

    private static EvidencePair pair(String rule, String query, String evidence, int gradeLevel) {
        return pair(rule, query, evidence, gradeLevel, true);
    }

    private static EvidencePair pair(String rule, String query, String evidence, int gradeLevel,
                                     boolean expectedSupported) {
        return new EvidencePair(rule, query, evidence, gradeLevel, expectedSupported);
    }

    private record EvidencePair(String rule, String query, String evidence, int gradeLevel,
                                boolean expectedSupported) {}

    private static CurriculumRAGService.RetrievedChunk chunk(String text) {
        return chunk(Subject.MATH, text);
    }

    private static CurriculumRAGService.RetrievedChunk chunk(Subject subject, String text) {
        return new CurriculumRAGService.RetrievedChunk("fixture", subject, GradeLevel.GRADE_1,
                "topic", text, 0.9, "source.pdf", List.of(196), List.of(30), "32/2018/TT-BGDDT");
    }

    private static CurriculumRAGService.RetrievedChunk chunk(String text, int gradeLevel) {
        return new CurriculumRAGService.RetrievedChunk("fixture-grade-" + gradeLevel, Subject.MATH,
                GradeLevel.valueOf("GRADE_" + gradeLevel),
                "topic", text, 0.9, "Thông-tư-32-2018-TT-BGDĐT.pdf", List.of(), List.of(), "32/2018/TT-BGDĐT");
    }
}
