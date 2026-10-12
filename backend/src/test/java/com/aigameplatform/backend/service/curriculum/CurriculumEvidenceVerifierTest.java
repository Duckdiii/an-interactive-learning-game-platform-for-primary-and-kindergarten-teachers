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
                pair("grade-scope", "Phép tính lớp 3", "Thực hiện được phép chia cho số có một chữ số.", "math-g3-013"),
                pair("grade-scope", "Yêu cầu lớp kế tiếp ngoài lớp đang chọn", "Thực hiện được phép chia cho số có một chữ số.", "math-g3-013", false),
                pair("digit-count", "Chia số có hai chữ số", "Thực hiện được phép chia cho số có không quá hai chữ số.", "math-g4-012"),
                pair("digit-count", "Chia số có ba chữ số", "Thực hiện được phép chia cho số có không quá hai chữ số.", "math-g4-012", false),
                pair("operation-count", "Biểu thức có hai dấu phép tính", "Tính được giá trị của biểu thức số có đến hai dấu phép tính và không có dấu ngoặc.", "math-g3-018"),
                pair("operation-count", "Biểu thức có ba dấu phép tính", "Tính được giá trị của biểu thức số có đến hai dấu phép tính và không có dấu ngoặc.", "math-g3-018", false),
                pair("carry", "Cộng có nhớ", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", "math-g3-009"),
                pair("carry", "Cộng không nhớ", "Thực hiện được phép cộng, phép trừ (không nhớ, có nhớ không quá một lượt) các số trong phạm vi 1000.", "math-g2-011"),
                pair("carry", "Cộng có nhớ", "Thực hiện được phép cộng, phép trừ (không nhớ) các số trong phạm vi 100.", "math-g1-005", false),
                pair("carry", "Cộng không nhớ", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", "math-g3-009", false),
                pair("carry-turn-limit", "Cộng có nhớ hai lượt", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", "math-g3-009"),
                pair("carry-turn-limit", "Cộng có nhớ ba lượt", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", "math-g3-009", false),
                pair("carry-turn-sequence", "Cộng có nhớ hai lượt không liên tiếp", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", "math-g3-009"),
                pair("carry-turn-sequence", "Cộng có nhớ hai lượt liên tiếp", "Thực hiện được phép cộng, phép trừ các số có đến 5 chữ số (có nhớ không quá hai lượt và không liên tiếp).", "math-g3-009", false),
                pair("numeric-boundary", "Đọc số trong phạm vi 100", "Đếm, đọc, viết được các số trong phạm vi 10; trong phạm vi 20; trong phạm vi 100.", "math-g1-001"),
                pair("numeric-boundary", "Đọc số trong phạm vi 101", "Đếm, đọc, viết được các số trong phạm vi 10; trong phạm vi 20; trong phạm vi 100.", "math-g1-001", false),
                pair("minute-position", "Đọc giờ khi kim phút chỉ số 6", "Đọc được giờ trên đồng hồ khi kim phút chỉ số 3, số 6.", "math-g2-035"),
                pair("minute-position", "Đọc giờ khi kim phút chỉ số 9", "Đọc được giờ trên đồng hồ khi kim phút chỉ số 3, số 6.", "math-g2-035", false),
                pair("shape", "Nhận dạng hình vuông", "Nhận dạng được hình vuông, hình tròn, hình tam giác, hình chữ nhật thông qua việc sử dụng bộ đồ dùng học tập cá nhân hoặc vật thật.", "math-g1-012"),
                pair("shape", "Nhận dạng hình ngũ giác", "Nhận dạng được hình vuông, hình tròn, hình tam giác, hình chữ nhật thông qua việc sử dụng bộ đồ dùng học tập cá nhân hoặc vật thật.", "math-g1-012", false),
                pair("rounding", "Làm tròn số đến hàng nghìn", "Làm quen với việc làm tròn số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn.", "math-g3-008"),
                pair("rounding", "Làm tròn số đến hàng triệu", "Làm quen với việc làm tròn số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn.", "math-g3-008", false),
                pair("area", "Tính diện tích hình chữ nhật", "Tính được diện tích hình chữ nhật, hình vuông.", "math-g3-045"),
                pair("area", "Tính diện tích hình tam giác", "Tính được chu vi của hình tam giác, hình tứ giác, hình chữ nhật, hình vuông khi biết độ dài các cạnh.", "math-g3-044", false),
                pair("area-shape-pair", "Tính diện tích hình chữ nhật", "Tính được diện tích hình chữ nhật, hình vuông.", "math-g3-045"),
                pair("area-shape-pair", "Tính diện tích hình tam giác", "Tính được diện tích hình chữ nhật, hình vuông. || Tính được chu vi của hình tam giác, hình tứ giác, hình chữ nhật, hình vuông khi biết độ dài các cạnh.", "math-g3-045 + math-g3-044", false),
                pair("multiplication-table", "Học bảng nhân 8", "Vận dụng được các bảng nhân, bảng chia 2, 3,..., 9 trong thực hành tính.", "math-g3-011"),
                pair("multiplication-table", "Học bảng nhân 10", "Vận dụng được các bảng nhân, bảng chia 2, 3,..., 9 trong thực hành tính.", "math-g3-011", false),
                pair("place-value", "Làm tròn đến hàng trăm nghìn", "Làm tròn được số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn, tròn trăm nghìn.", "math-g4-007"),
                pair("place-value", "Làm tròn đến hàng triệu", "Làm tròn được số đến tròn chục, tròn trăm, tròn nghìn, tròn mười nghìn, tròn trăm nghìn.", "math-g4-007", false)
        );

        int falseBlocks = 0;
        int falseAccepts = 0;
        for (var testCase : cases) {
            String[] sourceIds = testCase.source().split(" \\+ ");
            boolean actual = verifier.verify(testCase.query(), java.util.stream.IntStream
                    .range(0, testCase.evidence().split(" \\|\\| ").length)
                    .mapToObj(index -> chunk(testCase.evidence().split(" \\|\\| ")[index], sourceIds[index]))
                    .toList()).supported();
            if (testCase.expectedSupported() && !actual) falseBlocks++;
            if (!testCase.expectedSupported() && actual) falseAccepts++;
            assertThat(actual).as("rule=%s source=%s query=%s evidence=%s", testCase.rule(),
                    testCase.source(), testCase.query(), testCase.evidence()).isEqualTo(testCase.expectedSupported());
        }
        assertThat(cases).hasSize(30);
        assertThat(cases.stream().filter(EvidencePair::expectedSupported).count()).isEqualTo(15);
        assertThat(cases.stream().filter(testCase -> !testCase.expectedSupported()).count()).isEqualTo(15);
        assertThat(falseBlocks).as("false blocks on source-supported boundary cases").isZero();
        assertThat(falseAccepts).as("false accepts on adjacent unsupported claims").isZero();
    }

    @Test
    void rejectsAOneDigitOutcomeForARequestAboutTwoDigitDivisors() {
        var decision = verifier.verify("Chia cho số có hai chữ số trong phạm vi chương trình lớp 3",
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
    void rejectsAnOutcomeAboutOtherShapesForACircleCircumferenceRequest() {
        var decision = verifier.verify("Tính chu vi hình tròn",
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
        var decision = verifier.verify("Cộng có nhớ các số trong phạm vi 100",
                List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ các số trong phạm vi 100.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("carry:true");
    }

    @Test
    void rejectsARequestedClockPositionThatTheOutcomeDoesNotSpecify() {
        var decision = verifier.verify("Đọc giờ khi kim phút chỉ số 9",
                List.of(chunk("Đọc được giờ trên đồng hồ khi kim phút chỉ số 3, số 6.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("minute-position:9");
    }

    @Test
    void rejectsRoundingToThousandsWhenTheRetrievedOutcomeOnlyMentionsRoundHundreds() {
        var decision = verifier.verify("Làm tròn số đến hàng nghìn ở lớp 2",
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
        var decision = verifier.verify("Cộng có nhớ hai lượt trong phạm vi 1000",
                List.of(chunk("Thực hiện được phép cộng, phép trừ không nhớ hoặc có nhớ không quá một lượt trong phạm vi 1000.")));

        assertThat(decision.supported()).isFalse();
        assertThat(decision.constraints()).contains("carry-turn-limit:2>1");
    }

    @Test
    void rejectsNumbersAboveTheExplicitCurriculumRange() {
        var decision = verifier.verify("Đọc và viết số lớn hơn 100",
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
    void rejectsEveryStoredFalseAcceptanceUsingItsOriginalQueryAndTopCandidates() {
        assertUnsupported("Chia cho số có hai chữ số trong phạm vi chương trình lớp 3",
                "Thực hiện được phép chia cho số có một chữ số. Nhận biết phép chia hết và chia có dư.");
        assertUnsupported("Tính chu vi hình tròn",
                "Tính chu vi của hình tam giác, hình tứ giác, hình chữ nhật và hình vuông.");
        assertUnsupported("Tìm hiểu yêu cầu cần đạt về nội dung Tiếng Việt của lớp liền kề, không thuộc lớp đang tra cứu.",
                "Chú ý nghe người khác nói; đọc hiểu văn bản.");
        assertUnsupported("Tìm hiểu yêu cầu cần đạt về nội dung Tiếng Việt của lớp liền kề, không thuộc lớp đang tra cứu.",
                "Đọc thầm với tốc độ nhanh hơn lớp 3; viết được báo cáo thảo luận nhóm.");
        assertUnsupported("Tìm hiểu yêu cầu cần đạt về nội dung Tiếng Việt của lớp liền kề, không thuộc lớp đang tra cứu.",
                "Đọc thầm với tốc độ nhanh hơn lớp 4; nhận biết được nội dung chính.");
        assertUnsupported("Cộng có nhớ các số trong phạm vi 100",
                "Thực hiện phép cộng, phép trừ không nhớ các số trong phạm vi 100.");
        assertUnsupported("Đọc và viết số lớn hơn 100",
                "Đếm, đọc, viết các số trong phạm vi 100.");
        assertUnsupported("Cộng có nhớ hai lượt trong phạm vi 1000",
                "Phép cộng có nhớ không quá một lượt trong phạm vi 1000.");
        assertUnsupported("Đọc giờ khi kim phút chỉ số 9",
                "Đọc giờ trên đồng hồ khi kim phút chỉ số 3, số 6.");
        assertUnsupported("Làm tròn số đến hàng nghìn ở lớp 2",
                "Nhận biết được số tròn trăm; đọc, viết số trong phạm vi 1000.");
        assertUnsupported("Tìm thương khi chia cho số có hai chữ số",
                "Thực hiện được phép chia cho số có một chữ số.");
    }

    private void assertUnsupported(String query, String evidence) {
        var decision = verifier.verify(query, List.of(chunk(evidence)));
        assertThat(decision.supported()).as("query=%s evidence=%s", query, evidence).isFalse();
    }

    private static EvidencePair pair(String rule, String query, String evidence, String source) {
        return pair(rule, query, evidence, source, true);
    }

    private static EvidencePair pair(String rule, String query, String evidence, String source,
                                     boolean expectedSupported) {
        return new EvidencePair(rule, query, evidence, source, expectedSupported);
    }

    private record EvidencePair(String rule, String query, String evidence, String source,
                                boolean expectedSupported) {}

    private static CurriculumRAGService.RetrievedChunk chunk(String text) {
        return new CurriculumRAGService.RetrievedChunk("fixture", Subject.MATH, GradeLevel.GRADE_3,
                "topic", text, 0.9, "source.pdf", List.of(196), List.of(30), "32/2018/TT-BGDDT");
    }

    private static CurriculumRAGService.RetrievedChunk chunk(String text, String sourceId) {
        var gradeMatcher = java.util.regex.Pattern.compile("math-g([1-5])-").matcher(sourceId);
        GradeLevel grade = gradeMatcher.find()
                ? GradeLevel.valueOf("GRADE_" + gradeMatcher.group(1)) : GradeLevel.GRADE_3;
        return new CurriculumRAGService.RetrievedChunk(sourceId, Subject.MATH, grade,
                "topic", text, 0.9, "Thông-tư-32-2018-TT-BGDĐT.pdf", List.of(), List.of(), "32/2018/TT-BGDĐT");
    }
}
