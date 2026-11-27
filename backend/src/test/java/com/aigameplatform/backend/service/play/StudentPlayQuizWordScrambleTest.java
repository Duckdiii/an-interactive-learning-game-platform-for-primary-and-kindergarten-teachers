package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.entity.question.WordScrambleQuestion;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.QuizGameStrategy;
import com.aigameplatform.backend.service.strategy.WordScrambleGameStrategy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Quiz và Word Scramble nộp đáp án qua cùng API với các loại game khác; đáp án đúng không lộ trước khi nộp. */
class StudentPlayQuizWordScrambleTest {
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final StudentPlayService service = StudentPlayTestSupport.service(mock(GameRepository.class), sessions,
            mock(GameSessionRepository.class), mock(ParticipantRepository.class), strategies, mapper);
    private Participant participant;

    private void play(GameType type, QuestionGame question) {
        var game = new Game();
        game.setId("game");
        game.setTitle("Trò chơi");
        game.setGameType(type);
        game.setSubject(Subject.MATH);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));
        participant = new Participant();
        participant.setId("participant");
        var session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("salt");
        session.setStatus(SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        when(sessions.findById("session")).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private QuizQuestion quiz() {
        var question = new QuizQuestion();
        question.setId("db-quiz");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        question.setText("1 + 1 = ?");
        question.setOptions(new java.util.ArrayList<>(List.of("1", "2", "3")));
        question.setCorrectIndex(1);
        doReturn(new QuizGameStrategy(mapper)).when(strategies).get(GameType.QUIZ);
        return question;
    }

    private WordScrambleQuestion scramble() {
        var question = new WordScrambleQuestion();
        question.setId("db-ws");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        question.setCorrectWord("CHỊ");
        question.setScrambledLetters(new java.util.ArrayList<>(List.of("Ị", "C", "H")));
        doReturn(new WordScrambleGameStrategy(mapper)).when(strategies).get(GameType.WORD_SCRAMBLE);
        return question;
    }

    private JsonNode body(String json) {
        return mapper.readTree(json);
    }

    @Test
    void quizQuestionsDoNotRevealTheCorrectOption() {
        play(GameType.QUIZ, quiz());

        JsonNode question = service.questions("session", "participant").get("questions").get(0);

        assertThat(question.has("correctOptionId")).isFalse();
        assertThat(question.get("options").size()).isEqualTo(3);
        assertThat(question.toString()).doesNotContain("correctOptionId");
    }

    @Test
    void quizWrongAnswerIsSavedAndIsNotScoredTwice() {
        play(GameType.QUIZ, quiz());
        var input = body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"selectedOptionId\":\"a\"}");

        var result = service.interact("session", "participant", input);

        assertThat(result.get("status")).isEqualTo("INCORRECT");
        assertThat(result.get("correctAnswer").toString()).contains("b");
        assertThat(participant.getPlayInteractionDetails()).singleElement().satisfies(detail -> {
            assertThat(detail.getStatus()).isEqualTo(InteractionStatus.INCORRECT);
            assertThat(detail.getAnswerJson()).contains("\"a\"");
        });
        service.interact("session", "participant", input);
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
        assertThat(participant.getScore()).isZero();
    }

    @Test
    void quizCorrectAnswerSubmittedTwiceScoresOnlyOnce() {
        play(GameType.QUIZ, quiz());
        var input = body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"selectedOptionId\":\"b\"}");

        service.interact("session", "participant", input);
        int scoreAfterFirst = participant.getScore();
        service.interact("session", "participant", input);

        assertThat(scoreAfterFirst).isPositive();
        assertThat(participant.getScore()).isEqualTo(scoreAfterFirst);
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
    }

    @Test
    void wordScrambleRejectsAnAbsurdlyLongWord() {
        play(GameType.WORD_SCRAMBLE, scramble());

        assertThatThrownBy(() -> service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"word\":\"" + "x".repeat(101) + "\"}")))
                .isInstanceOf(ApiException.class);
        assertThat(participant.getPlayInteractionDetails()).isEmpty();
    }

    @Test
    void quizCorrectAnswerScoresAndUnknownOptionIsRejected() {
        play(GameType.QUIZ, quiz());

        assertThatThrownBy(() -> service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"selectedOptionId\":\"z\"}")))
                .isInstanceOf(ApiException.class);
        var result = service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"selectedOptionId\":\"b\"}"));

        assertThat(result.get("status")).isEqualTo("CORRECT");
        assertThat(((Number) result.get("pointsEarned")).intValue()).isGreaterThan(0);
    }

    @Test
    void wordScrambleQuestionsDoNotRevealTheCorrectWord() {
        play(GameType.WORD_SCRAMBLE, scramble());

        JsonNode question = service.questions("session", "participant").get("questions").get(0);

        assertThat(question.has("correctWord")).isFalse();
        assertThat(question.get("scrambledLetters").size()).isEqualTo(3);
        assertThat(question.toString()).doesNotContain("CHỊ");
    }

    @Test
    void wordScrambleWrongWordIsSavedAndCorrectWordIgnoresCaseAndSpaces() {
        play(GameType.WORD_SCRAMBLE, scramble());

        var wrong = service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"word\":\"CHI\"}"));
        assertThat(wrong.get("status")).isEqualTo("INCORRECT");
        assertThat(participant.getPlayInteractionDetails()).singleElement()
                .satisfies(detail -> assertThat(detail.getAnswerJson()).contains("CHI"));

        play(GameType.WORD_SCRAMBLE, scramble());
        var right = service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"word\":\"  chị \"}"));
        assertThat(right.get("status")).isEqualTo("CORRECT");
    }

    @Test
    void wordScrambleNeedsAWordUnlessSkipped() {
        play(GameType.WORD_SCRAMBLE, scramble());

        assertThatThrownBy(() -> service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000}"))).isInstanceOf(ApiException.class);
        var skipped = service.interact("session", "participant",
                body("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"outcome\":\"SKIPPED\"}"));
        assertThat(skipped.get("status")).isEqualTo("SKIPPED");
    }
}
