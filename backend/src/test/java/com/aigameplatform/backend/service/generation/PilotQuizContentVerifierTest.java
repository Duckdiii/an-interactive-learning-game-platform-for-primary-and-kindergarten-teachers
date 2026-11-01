package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.*;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.service.curriculum.*;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PilotQuizContentVerifierTest {
    private PilotQuizContentVerifier verifier;
    private CurriculumEvidence evidence;

    @BeforeEach
    void setUp() throws IOException {
        CurriculumDataset dataset = CurriculumDataset.loadDefault();
        CurriculumConstraints constraints = CurriculumConstraints.load(dataset);
        verifier = new PilotQuizContentVerifier(constraints, constraints.sha256());
        var chunk = new CurriculumRAGService.RetrievedChunk("math-g1-007", Subject.MATH, GradeLevel.GRADE_1,
                "Addition", "Mental addition and subtraction within 10", 0.99,
                dataset.source().sourceDocument(), List.of(1), List.of(1), dataset.source().curriculumVersion());
        evidence = CurriculumEvidence.from(dataset.source(), "fixture", List.of(chunk));
    }

    @Test
    void independentlyVerifiesAUniqueCorrectAnswerWithinTheRetrievedOutcomeCapability() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question("Tính nhẩm: 2 + 3 = ?", "5", "4", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.VERIFIED);
        assertThat(result.chunkIds()).containsExactly("math-g1-007");
    }

    @Test
    void rejectsWrongAnswerEvenIfASecondReviewerWouldApproveIt() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question("Tính nhẩm: 2 + 3 = ?", "4", "5", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("SELECTED_ANSWER_IS_INCORRECT");
    }

    @Test
    void rejectsMultipleNumericallyCorrectOptions() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question("Tính nhẩm: 2 + 3 = ?", "5", "5", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_DOES_NOT_HAVE_EXACTLY_ONE_CORRECT_OPTION");
    }

    @Test
    void rejectsAContradictoryResultClaimInTheQuestionText() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question(
                        "Tính nhẩm: 2 + 3 = 100", "5", "4", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_STATES_AN_INCORRECT_ARITHMETIC_RESULT");
    }

    @Test
    void rejectsNegativeResultsOutsideThePrimaryNaturalNumberDomain() {
        var result = verifier.verify(game("Trừ trong phạm vi 10", question("1 - 2 = ?", "-1", "1", "a")),
                "Trừ trong phạm vi 10", evidence);

        assertThat(result.status()).as("errors: %s", result.errors()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_ARITHMETIC_OUTSIDE_PRIMARY_NUMBER_DOMAIN");
    }

    @Test
    void rejectsNegativeOperandsOutsideThePrimaryNaturalNumberDomain() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question("Tính nhẩm: -1 + 5 = ?", "4", "5", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_ARITHMETIC_OUTSIDE_PRIMARY_NUMBER_DOMAIN");
    }

    @Test
    void leavesSameSkillRequestsWithMultipleRangesUnverified() {
        var result = verifier.verify(game("Cộng trong phạm vi 10 và cộng trong phạm vi 20",
                        question("2 + 3 = ?", "5", "4", "a")),
                "Cộng trong phạm vi 10 và cộng trong phạm vi 20", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.UNVERIFIED);
        assertThat(result.errors()).extracting(e -> e.message()).contains("MULTIPLE_CONSTRAINTS_FOR_SAME_SKILL_NOT_SUPPORTED");
    }

    @Test
    void rejectsAnItemThatExceedsTheRequestedRangeAndRetrievedYccdCapability() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question("Tính nhẩm: 8 + 9 = ?", "17", "16", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_EXCEEDS_REQUESTED_NUMBER_RANGE");
    }

    @Test
    void rejectsOutOfScopeNumbersMentionedOutsideTheEquationToo() {
        var result = verifier.verify(game("Cộng nhẩm trong phạm vi 10", question(
                        "Trong phạm vi 1000, tính nhẩm: 2 + 3 = ?", "5", "4", "a")),
                "Cộng nhẩm trong phạm vi 10", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_CONTENT_EXCEEDS_YCCĐ_NUMBER_RANGE");
    }

    @Test
    void rejectsBorrowingExamplesForANoBorrowRequestEvenWhenTheBorrowIsResolvedInAHigherDigit() {
        var noBorrowEvidence = evidenceFor("math-g1-005");
        for (var example : List.of(new String[] {"10 - 1 = ?", "9"}, new String[] {"20 - 11 = ?", "9"})) {
            var result = verifier.verify(game("Trừ không nhớ trong phạm vi 100",
                            question(example[0], example[1], "8", "a")),
                    "Trừ không nhớ trong phạm vi 100", noBorrowEvidence);
            assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
            assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_EXCEEDS_REQUESTED_CARRY_CONSTRAINT");
        }
    }

    @Test
    void doesNotExceedANoCarryOutcomeWhenTheRequestLeavesCarryUnspecified() {
        var result = verifier.verify(game("Cộng trong phạm vi 100", question("65 + 35 = ?", "100", "99", "a")),
                "Cộng trong phạm vi 100", evidenceFor("math-g1-005"));

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.INVALID);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_OUTSIDE_RETRIEVED_YCCĐ_CAPABILITY");
    }

    @Test
    void doesNotLetAHighSimilarityChunkOrAnLlmReviewCertifySemanticQuestions() {
        var result = verifier.verify(game("Đếm con vật", question("Có bao nhiêu con vật?", "5", "4", "a")),
                "Đếm con vật", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.UNVERIFIED);
        assertThat(result.errors()).extracting(e -> e.message()).contains("QUESTION_NOT_MACHINE_CHECKABLE");
    }

    @Test
    void sampleThirtySweetsGiveAwayTwentyFiveAndAnswerFiftyFiveRemainsUnverified() {
        var result = verifier.verify(game("Trừ trong phạm vi 100", question(
                        "Bà có 30 cái kẹo, cho em 25 cái. Bà còn bao nhiêu cái kẹo?", "55", "5", "a")),
                "Trừ trong phạm vi 100", evidence);

        assertThat(result.status()).isEqualTo(PilotQuizContentVerifier.Status.UNVERIFIED);
    }

    private static GameDsl game(String topic, QuizQuestionDsl question) {
        return new QuizGameDsl("1.0.0", GameType.QUIZ,
                new GameMetadata("Pilot", Subject.MATH, GradeLevel.GRADE_1, topic),
                new GameplaySettings(1.0), List.of(question));
    }

    private static QuizQuestionDsl question(String prompt, String right, String distractor, String selectedId) {
        return new QuizQuestionDsl("q1", 30, 10, null, null, null, null, prompt,
                List.of(new TextChoiceDsl("a", right), new TextChoiceDsl("b", distractor)), selectedId);
    }

    private static CurriculumEvidence evidenceFor(String chunkId) {
        try {
            var dataset = CurriculumDataset.loadDefault();
            var chunk = new CurriculumRAGService.RetrievedChunk(chunkId, Subject.MATH, GradeLevel.GRADE_1,
                    "Addition and subtraction", "No regrouping within 100", 0.99,
                    dataset.source().sourceDocument(), List.of(1), List.of(1), dataset.source().curriculumVersion());
            return CurriculumEvidence.from(dataset.source(), "fixture", List.of(chunk));
        } catch (IOException e) { throw new java.io.UncheckedIOException(e); }
    }
}
