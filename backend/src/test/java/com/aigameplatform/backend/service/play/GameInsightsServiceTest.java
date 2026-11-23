package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.session.GameInsightsDto;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.entity.question.MemoryCardQuestion;
import com.aigameplatform.backend.entity.question.embedded.MemoryPair;
import com.aigameplatform.backend.entity.question.embedded.PairSide;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.grading.GradeContext;
import com.aigameplatform.backend.service.play.grading.MemoryCardHandler;
import com.aigameplatform.backend.service.play.grading.PlayRecorder;
import com.aigameplatform.backend.service.play.insight.MemoryCardWrongAnswerLabeler;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import com.aigameplatform.backend.entity.question.embedded.OddOneOutImageItem;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeBlank;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeImageOption;
import com.aigameplatform.backend.service.play.insight.VisualClozeImageWrongAnswerLabeler;
import com.aigameplatform.backend.service.play.insight.AudioVisualWrongAnswerLabeler;
import com.aigameplatform.backend.service.play.insight.OddOneOutImageWrongAnswerLabeler;
import com.aigameplatform.backend.service.play.support.OpaqueIds;
import com.aigameplatform.backend.service.play.insight.QuizWrongAnswerLabeler;
import com.aigameplatform.backend.service.play.insight.WordScrambleWrongAnswerLabeler;
import com.aigameplatform.backend.service.play.insight.VisualClozeTextWrongAnswerLabeler;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import tools.jackson.databind.json.JsonMapper;
import com.aigameplatform.backend.entity.question.WordScrambleQuestion;
import com.aigameplatform.backend.entity.session.GameSession;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.entity.session.SoloSession;
import com.aigameplatform.backend.entity.session.TeamSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GameInsightsServiceTest {

    private final GameRepository games = mock(GameRepository.class);
    private final GameSessionRepository sessions = mock(GameSessionRepository.class);
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "t@example.com", "s1");
    private GameInsightsService service;
    private Game game;
    private QuizQuestion quiz;
    private WordScrambleQuestion scramble;

    @BeforeEach
    void setUp() {
        service = new GameInsightsService(games, sessions,
                List.of(new VisualClozeTextWrongAnswerLabeler(), new VisualClozeImageWrongAnswerLabeler(),
                        new AudioVisualWrongAnswerLabeler(), new MemoryCardWrongAnswerLabeler(),
                        new OddOneOutImageWrongAnswerLabeler(), new QuizWrongAnswerLabeler(),
                        new WordScrambleWrongAnswerLabeler()),
                new BlockedWordList(List.of("xấu")), JsonMapper.builder().build());
        Teacher author = new Teacher();
        author.setId("teacher-1");
        quiz = new QuizQuestion();
        quiz.setId("q1");
        quiz.setItemIndex(0);
        quiz.setText("1 + 1 = ?");
        scramble = new WordScrambleQuestion();
        scramble.setId("q2");
        scramble.setItemIndex(1);
        game = new Game();
        game.setId("game-1");
        game.setAuthor(author);
        game.setQuestions(List.of(quiz, scramble));
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.of(game));
    }

    @Test
    void gameWithoutSessionsHasZeroPlays() {
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of());

        GameInsightsDto result = service.getInsights("game-1", null, null, null, null, teacher);

        assertThat(result.playCount()).isZero();
        assertThat(result.questions()).hasSize(2);
        assertThat(result.questions().get(0).answeredCount()).isZero();
        assertThat(result.questions().get(0).needsReview()).isFalse();
    }

    @Test
    void aggregatesPerQuestionAndFlagsWeakOnes() {
        SoloSession session = new SoloSession();
        for (int i = 0; i < 5; i++) {
            // 2 đúng, 3 sai ở câu 1 (tỉ lệ 0,4 < 0,6 và đủ 5 lượt); câu 2 đều đúng.
            session.getParticipants().add(participant(
                    detail(quiz, i < 2 ? InteractionStatus.CORRECT : InteractionStatus.INCORRECT, 1),
                    detail(scramble, InteractionStatus.CORRECT, 2)));
        }
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        GameInsightsDto result = service.getInsights("game-1", null, null, null, null, teacher);

        assertThat(result.playCount()).isEqualTo(5);
        var first = result.questions().get(0);
        assertThat(first.text()).isEqualTo("1 + 1 = ?");
        assertThat(first.correctRate()).isEqualTo(0.4);
        assertThat(first.needsReview()).isTrue();
        assertThat(first.commonWrong()).isEmpty();
        var second = result.questions().get(1);
        assertThat(second.correctRate()).isEqualTo(1.0);
        assertThat(second.avgAttempts()).isEqualTo(2.0);
        assertThat(second.needsReview()).isFalse();
        assertThat(second.text()).isEqualTo("Câu 2");
        assertThat(result.correctRate()).isEqualTo(0.7);
    }

    @Test
    void fewAnswersAreNeverFlagged() {
        SoloSession session = new SoloSession();
        session.getParticipants().add(participant(detail(quiz, InteractionStatus.INCORRECT, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        assertThat(service.getInsights("game-1", null, null, null, null, teacher).questions().get(0).needsReview()).isFalse();
    }

    @Test
    void inProgressInteractionsAreIgnored() {
        SoloSession session = new SoloSession();
        session.getParticipants().add(participant(detail(quiz, InteractionStatus.IN_PROGRESS, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        GameInsightsDto result = service.getInsights("game-1", null, null, null, null, teacher);

        assertThat(result.playCount()).isZero();
        assertThat(result.questions().get(0).answeredCount()).isZero();
    }

    @Test
    void filtersBySessionType() {
        GameSession solo = new SoloSession();
        solo.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        GameSession self = new SelfSession();
        self.getParticipants().add(participant(detail(quiz, InteractionStatus.INCORRECT, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(solo, self));

        assertThat(service.getInsights("game-1", SessionType.SELF, null, null, null, teacher).playCount()).isEqualTo(1);
        assertThat(service.getInsights("game-1", SessionType.SELF, null, null, null, teacher).questions().get(0).correctRate()).isZero();
        assertThat(service.getInsights("game-1", null, null, null, null, teacher).playCount()).isEqualTo(2);
    }

    @Test
    void otherTeachersGameIsNotFound() {
        AuthenticatedTeacher other = new AuthenticatedTeacher("teacher-2", "o@example.com", "s2");
        when(games.findByIdAndAuthor_Id("game-1", "teacher-2")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getInsights("game-1", null, null, null, null, other))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void labelFallsBackToQuestionNumberWhenTextIsMissing() {
        quiz.setText(" ");
        assertThat(quiz.insightLabel()).isEqualTo("Câu 1");
        scramble.setCorrectWord("CHỊ");
        assertThat(scramble.insightLabel()).isEqualTo("CHỊ");
    }

    @Test
    void textClozeCommonWrongNeedsTwoRepeatsAndMergesCase() {
        VisualClozeQuestion cloze = cloze("c1", 0);
        game.setQuestions(List.of(cloze));
        SelfSession session = new SelfSession();
        for (String typed : List.of("CHI", "chi ", "ba", "xấu hoắc", "xấu hoắc")) {
            session.getParticipants().add(participant(wrong(cloze, "{\"answer\":\"" + typed + "\"}")));
        }
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var wrongs = service.getInsights("game-1", null, null, null, null, teacher).questions().get(0).commonWrong();

        // "CHI" và "chi" gộp thành 2 lần; "ba" chỉ 1 lần; "xấu hoắc" bị lọc vì chứa từ cấm.
        assertThat(wrongs).containsExactly(new GameInsightsDto.CommonWrongDto("CHI", 2));
    }

    @Test
    void typedAnswersThatLookLikePersonalInfoNeverBecomeLabels() {
        VisualClozeQuestion cloze = cloze("c1", 0);
        game.setQuestions(List.of(cloze));
        SelfSession session = new SelfSession();
        for (String typed : List.of("be.an@gmail.com", "be.an@gmail.com", "0912 345 678", "0912 345 678",
                "www.abc.vn", "www.abc.vn", "chi", "chi")) {
            session.getParticipants().add(participant(wrong(cloze, "{\"answer\":\"" + typed + "\"}")));
        }
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var wrongs = service.getInsights("game-1", null, null, null, null, teacher).questions().get(0).commonWrong();

        assertThat(wrongs).containsExactly(new GameInsightsDto.CommonWrongDto("chi", 2));
    }

    @Test
    void audioVisualAndOddOneOutDecodeOpaqueChoices() {
        String salt = "salt-1";
        AudioVisualMatchQuestion av = new AudioVisualMatchQuestion();
        av.setId("av");
        ImageChoice d0 = new ImageChoice();
        d0.setVisualPrompt("con mèo");
        ImageChoice d1 = new ImageChoice();
        d1.setVisualPrompt("con chó");
        av.setDistractors(new java.util.ArrayList<>(List.of(d0, d1)));
        OddOneOutQuestion odd = new OddOneOutQuestion();
        odd.setId("odd");
        odd.setImageItems(new java.util.ArrayList<>(List.of(
                new OddOneOutImageItem("a1", "táo", "u1"), new OddOneOutImageItem("a2", "cam", "u2"))));
        game.setQuestions(List.of(av, odd));
        SelfSession session = new SelfSession();
        session.setStudentOptionSalt(salt);
        String avWrong = OpaqueIds.opaque(salt, 0, "avm:2"); // distractor thứ hai: "con chó"
        String oddWrong = OpaqueIds.opaque(salt, 1, "odd:b"); // ảnh thứ hai: "cam"
        for (int i = 0; i < 2; i++) {
            session.getParticipants().add(participant(
                    wrong(av, "{\"selectedOptionId\":\"" + avWrong + "\"}"),
                    wrong(odd, "{\"selectedItemId\":\"" + oddWrong + "\"}")));
        }
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var questions = service.getInsights("game-1", null, null, null, null, teacher).questions();

        assertThat(questions.get(0).commonWrong()).containsExactly(new GameInsightsDto.CommonWrongDto("con chó", 2));
        assertThat(questions.get(1).commonWrong()).containsExactly(new GameInsightsDto.CommonWrongDto("cam", 2));
    }

    @Test
    void choiceAnswersWithoutSaltYieldNoLabel() {
        AudioVisualMatchQuestion av = new AudioVisualMatchQuestion();
        av.setId("av");
        game.setQuestions(List.of(av));
        SelfSession session = new SelfSession();
        for (int i = 0; i < 2; i++) {
            session.getParticipants().add(participant(wrong(av, "{\"selectedOptionId\":\"x1\"}")));
        }
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        assertThat(service.getInsights("game-1", null, null, null, null, teacher).questions().get(0).commonWrong()).isEmpty();
    }

    @Test
    void completionRateAndAverageScoreCoverOnlyStudentsWhoPlayed() {
        SoloSession session = new SoloSession();
        Participant finished = participant(detail(quiz, InteractionStatus.CORRECT, 1));
        finished.setScore(80);
        finished.setCompletedAt(java.time.LocalDateTime.now());
        Participant gaveUp = participant(detail(quiz, InteractionStatus.INCORRECT, 1));
        gaveUp.setScore(20);
        Participant onlyJoined = participant(); // vào phòng nhưng chưa trả lời câu nào: không tính là đã chơi
        onlyJoined.setScore(999);
        Participant cutOff = participant(detail(quiz, InteractionStatus.CORRECT, 1)); // giáo viên đóng phòng khi chưa xong
        cutOff.setScore(50);
        cutOff.setCompletedAt(java.time.LocalDateTime.now());
        cutOff.setNote(Participant.ENDED_BY_CLOSE_NOTE);
        session.getParticipants().addAll(List.of(finished, gaveUp, onlyJoined, cutOff));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var result = service.getInsights("game-1", null, null, null, null, teacher);

        assertThat(result.playCount()).isEqualTo(3);
        assertThat(result.completionRate()).isEqualTo(1.0 / 3);
        assertThat(result.avgScore()).isEqualTo(50.0);
    }

    @Test
    void noPlaysMeansZeroCompletionAndScore() {
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of());

        var result = service.getInsights("game-1", null, null, null, null, teacher);

        assertThat(result.completionRate()).isZero();
        assertThat(result.avgScore()).isZero();
    }

    @Test
    void fewPlaysAreFlaggedAsLowSampleButNoPlaysAreNot() {
        SoloSession session = new SoloSession();
        session.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));
        assertThat(service.getInsights("game-1", null, null, null, null, teacher).lowSample()).isTrue();

        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of());
        assertThat(service.getInsights("game-1", null, null, null, null, teacher).lowSample()).isFalse();
    }

    @Test
    void dateRangeKeepsOnlySessionsCreatedInsideIt() {
        SoloSession old = new SoloSession();
        old.setCreatedAt(java.time.LocalDateTime.of(2026, 11, 1, 10, 0));
        old.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        SoloSession recent = new SoloSession();
        recent.setCreatedAt(java.time.LocalDateTime.of(2026, 11, 20, 23, 30));
        recent.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(recent, old));
        var from = java.time.LocalDate.of(2026, 11, 15);
        var to = java.time.LocalDate.of(2026, 11, 20);

        assertThat(service.getInsights("game-1", null, from, to, null, teacher).playCount()).isEqualTo(1);
        // `to` tính trọn ngày, nên phiên 23:30 ngày 20 vẫn nằm trong khoảng.
        assertThat(service.getInsights("game-1", null, from, from, null, teacher).playCount()).isZero();
        assertThatThrownBy(() -> service.getInsights("game-1", null, to, from, null, teacher))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void questionDetailShowsRepeatedAnswersAndBucketsTheRest() {
        VisualClozeQuestion cloze = cloze("c1", 0);
        game.setQuestions(List.of(cloze));
        SelfSession session = new SelfSession();
        for (String typed : List.of("chị", "chị", "chi", "chi", "chi", "ba")) {
            boolean ok = typed.equals("chị");
            var d = ok ? detail(cloze, InteractionStatus.CORRECT, 1) : wrong(cloze, null);
            d.setAnswerJson("{\"answer\":\"" + typed + "\"}");
            session.getParticipants().add(participant(d));
        }
        session.getParticipants().add(participant(detail(cloze, InteractionStatus.TIMEOUT, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var detail = service.getQuestionInsights("game-1", "c1", null, null, null, null, teacher);

        assertThat(detail.answeredCount()).isEqualTo(7);
        assertThat(detail.distribution()).containsExactly(
                new GameInsightsDto.AnswerShareDto("chi", 3, false),
                new GameInsightsDto.AnswerShareDto("chị", 2, true));
        assertThat(detail.otherCount()).isEqualTo(1); // "ba" chỉ một lần nên không nêu riêng
        assertThat(detail.noAnswerCount()).isEqualTo(1);
        assertThatThrownBy(() -> service.getQuestionInsights("game-1", "missing", null, null, null, null, teacher))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void reviewNeededListsWeakestQuestionsOfPublishedGamesOnly() {
        game.setTitle("Toán");
        game.setStatus(com.aigameplatform.backend.entity.enums.GameStatus.PUBLISHED);
        SoloSession session = new SoloSession();
        for (int i = 0; i < 5; i++) { // câu 1: 1/5 đúng (cần ôn lại); câu 2: 5/5 đúng
            session.getParticipants().add(participant(
                    detail(quiz, i == 0 ? InteractionStatus.CORRECT : InteractionStatus.INCORRECT, 1),
                    detail(scramble, InteractionStatus.CORRECT, 1)));
        }
        Game draft = new Game();
        draft.setId("draft");
        draft.setStatus(com.aigameplatform.backend.entity.enums.GameStatus.DRAFT);
        when(games.findByAuthor_IdOrderByUpdatedAtDesc("teacher-1")).thenReturn(List.of(game, draft));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var weak = service.listReviewNeeded(3, teacher);

        assertThat(weak).singleElement().satisfies(item -> {
            assertThat(item.gameId()).isEqualTo("game-1");
            assertThat(item.questionText()).isEqualTo("1 + 1 = ?");
            assertThat(item.correctRate()).isEqualTo(0.2);
            assertThat(item.commonWrong()).isNull();
        });
        assertThatThrownBy(() -> service.listReviewNeeded(0, teacher)).isInstanceOf(ApiException.class);
    }

    @Test
    void quizAndWordScrambleWrongAnswersAreDecodedIntoLabels() {
        quiz.setOptions(new java.util.ArrayList<>(List.of("một", "hai", "ba")));
        SelfSession session = new SelfSession();
        for (int i = 0; i < 2; i++) {
            session.getParticipants().add(participant(
                    wrong(quiz, "{\"selectedOptionId\":\"c\"}"),
                    wrong(scramble, "{\"word\":\"CHI\"}")));
        }
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var questions = service.getInsights("game-1", null, null, null, null, teacher).questions();

        assertThat(questions.get(0).commonWrong()).containsExactly(new GameInsightsDto.CommonWrongDto("ba", 2));
        assertThat(questions.get(1).commonWrong()).containsExactly(new GameInsightsDto.CommonWrongDto("CHI", 2));
    }

    @Test
    void classroomFilterKeepsOnlySessionsOfThatClassroom() {
        var classA = new com.aigameplatform.backend.entity.Classroom();
        classA.setId("class-a");
        var classB = new com.aigameplatform.backend.entity.Classroom();
        classB.setId("class-b");
        SoloSession inA = new SoloSession();
        inA.setClassroom(classA);
        inA.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        TeamSession inB = new TeamSession();
        inB.setClassroom(classB);
        inB.getParticipants().add(participant(detail(quiz, InteractionStatus.INCORRECT, 1)));
        inB.getParticipants().add(participant(detail(quiz, InteractionStatus.INCORRECT, 1)));
        SoloSession noClass = new SoloSession();
        noClass.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        SelfSession selfPlay = new SelfSession();
        selfPlay.getParticipants().add(participant(detail(quiz, InteractionStatus.CORRECT, 1)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(inA, inB, noClass, selfPlay));

        assertThat(service.getInsights("game-1", null, null, null, "class-a", teacher).playCount()).isEqualTo(1);
        assertThat(service.getInsights("game-1", null, null, null, "class-b", teacher).playCount()).isEqualTo(2);
        assertThat(service.getInsights("game-1", null, null, null, "class-b", teacher).questions().get(0).correctRate())
                .isZero();
        assertThat(service.getInsights("game-1", null, null, null, "missing-class", teacher).playCount()).isZero();
        // Không lọc lớp thì tính cả phiên không gắn lớp và chơi tự do.
        assertThat(service.getInsights("game-1", null, null, null, null, teacher).playCount()).isEqualTo(5);
    }

    @Test
    void reviewContextChecksOwnershipAndThatQuestionsBelongToTheGame() {
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of());
        game.setTitle("Toán");

        var context = service.reviewContext("teacher-1", "game-1", List.of("q2"));

        assertThat(context.gameTitle()).isEqualTo("Toán");
        assertThat(context.questions()).extracting(q -> q.questionId()).containsExactly("q2");
        assertThatThrownBy(() -> service.reviewContext("teacher-1", "game-1", List.of("other-game-question")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        when(games.findByIdAndAuthor_Id("game-1", "teacher-2")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.reviewContext("teacher-2", "game-1", List.of("q1")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    private static VisualClozeQuestion cloze(String id, int index) {
        VisualClozeQuestion q = new VisualClozeQuestion();
        q.setId(id);
        q.setItemIndex(index);
        return q;
    }

    @Test
    void imageClozeCountsMistakesDespiteCorrectRetryOrTimeout() {
        VisualClozeQuestion cloze = new VisualClozeQuestion();
        cloze.setId("image");
        cloze.setBlanks(List.of(new VisualClozeBlank("a", 100, 100, "cat")));
        cloze.setOptions(List.of(new VisualClozeImageOption("dog", "Ch\u00f3", null)));
        game.setQuestions(List.of(cloze));

        SelfSession session = new SelfSession();
        String salt = "image-salt";
        session.setStudentOptionSalt(salt);
        String answer = """
                {"firstWrongPlacement":{"blankId":"%s","optionId":"%s"}}
                """.formatted(OpaqueIds.opaque(salt, 0, "blank:a"), OpaqueIds.opaque(salt, 0, "option:dog"));
        var corrected = wrong(cloze, answer);
        corrected.setStatus(InteractionStatus.CORRECT);
        var timedOut = wrong(cloze, answer);
        timedOut.setStatus(InteractionStatus.TIMEOUT);
        var legacy = wrong(cloze, "{\"placements\":[]}");
        var unfinished = wrong(cloze, answer);
        unfinished.setStatus(InteractionStatus.IN_PROGRESS);
        session.getParticipants().addAll(List.of(participant(corrected), participant(timedOut), participant(legacy), participant(unfinished)));
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var result = service.getInsights("game-1", null, null, null, null, teacher).questions().getFirst();
        assertThat(result.commonWrong()).containsExactly(new GameInsightsDto.CommonWrongDto("\u00d4 1: Ch\u00f3", 2));
        assertThat(result.correctRate()).isEqualTo(1.0 / 3);
        var detail = service.getQuestionInsights("game-1", "image", null, null, null, null, teacher);
        assertThat(detail.distribution()).isEmpty();
        assertThat(detail.noAnswerCount()).isEqualTo(1);
        assertThat(detail.otherCount()).isEqualTo(2);
    }

    @Test
    void memoryCardKeepsDifferentRepeatedMistakesFromSuccessfulPlays() {
        MemoryCardQuestion memory = new MemoryCardQuestion();
        memory.setId("memory");
        memory.setTimeLimit(30);
        memory.setPoint(100);
        memory.setPairs(List.of(memoryPair("a", "Mèo"), memoryPair("b", "Cá"), memoryPair("c", "Chó")));
        game.setQuestions(List.of(memory));
        SelfSession session = new SelfSession();
        session.setGame(game);
        when(sessions.findByGame_IdOrderByCreatedAtDesc("game-1")).thenReturn(List.of(session));

        var mapper = JsonMapper.builder().build();
        var handler = new MemoryCardHandler(new PlayRecorder(mapper, mock(SelfSessionRepository.class), sessions));
        var legacy = mapper.readTree("""
                {"matchedPairIds":["a","b","c"],"flips":6}
                """);
        var answer = mapper.readTree("""
                {"matchedPairIds":["a","b","c"],"flips":10,"wrongPairs":[["b","a"],["c","b"]]}
                """);
        var invalid = mapper.readTree("""
                {"matchedPairIds":["a","b","c"],"flips":8,"wrongPairs":[["a","other"]]}
                """);
        assertThatThrownBy(() -> handler.grade(new GradeContext(session, new Participant(), memory, 0, null, invalid, null, 1000)))
                .isInstanceOf(ApiException.class);
        for (var payload : List.of(answer, answer, legacy)) {
            var player = new Participant();
            session.getParticipants().add(player);
            assertThat(handler.grade(new GradeContext(session, player, memory, 0, null, payload, null, 1000)).get("status"))
                    .isEqualTo("CORRECT");
        }
        var result = service.getInsights("game-1", null, null, null, null, teacher).questions().getFirst();
        assertThat(result.correctRate()).isEqualTo(1.0);
        assertThat(result.commonWrong()).containsExactly(
                new GameInsightsDto.CommonWrongDto("Mèo ↔ Cá", 2),
                new GameInsightsDto.CommonWrongDto("Cá ↔ Chó", 2));
    }

    private static MemoryPair memoryPair(String id, String label) {
        MemoryPair pair = new MemoryPair();
        pair.setPairId(id);
        PairSide content = new PairSide();
        content.setText(label);
        pair.setContent(content);
        return pair;
    }

    private static PlayInteractionDetail wrong(
            com.aigameplatform.backend.entity.question.QuestionGame question, String answerJson) {
        PlayInteractionDetail d = detail(question, InteractionStatus.INCORRECT, 1);
        d.setAnswerJson(answerJson);
        return d;
    }

    private static Participant participant(PlayInteractionDetail... details) {
        Participant p = new Participant();
        p.getPlayInteractionDetails().addAll(List.of(details));
        return p;
    }

    private static PlayInteractionDetail detail(
            com.aigameplatform.backend.entity.question.QuestionGame question, InteractionStatus status, int attempts) {
        PlayInteractionDetail d = new PlayInteractionDetail();
        d.setQuestion(question);
        d.setStatus(status);
        d.setAttemptsCount(attempts);
        return d;
    }
}
