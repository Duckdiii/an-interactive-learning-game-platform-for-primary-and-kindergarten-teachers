package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.AudioVisualMatchGameStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class StudentPlayAudioVisualServiceTest {
    private final GameRepository games = mock(GameRepository.class);
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final StudentPlayService service = new StudentPlayService(games, sessions, strategies, mapper);
    private Participant participant;

    @BeforeEach
    void setUp() {
        var question = new AudioVisualMatchQuestion();
        question.setId("db-q1");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        question.setAudioText("cat");
        question.setCorrect(choice("cat"));
        question.setDistractors(List.of(choice("dog"), choice("bird")));
        var game = new Game();
        game.setId("game");
        game.setTitle("Animals");
        game.setGameType(GameType.AUDIO_VISUAL_MATCH);
        game.setSubject(Subject.ENGLISH);
        game.setGrade(GradeLevel.GRADE_3);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));
        participant = new Participant();
        participant.setId("participant");
        var session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("secret-test-salt");
        session.setStatus(SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        doReturn(new AudioVisualMatchGameStrategy(mapper)).when(strategies).get(GameType.AUDIO_VISUAL_MATCH);
        when(sessions.findById("session")).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private ImageChoice choice(String label) {
        var choice = new ImageChoice();
        choice.setVisualPrompt(label);
        choice.setImageUrl("https://images.example/" + label + ".png");
        return choice;
    }

    private JsonNode question() { return service.questions("session", "participant").get("questions").get(0); }

    private String optionId(String prompt) {
        for (JsonNode option : question().get("options")) {
            if (prompt.equals(option.get("visualPrompt").asString())) return option.get("id").asString();
        }
        throw new AssertionError("Missing option " + prompt);
    }

    @Test
    void studentReceivesStableShuffledOptionsWithoutAnswerKey() {
        var first = question();
        assertThat(first.has("correct")).isFalse();
        assertThat(first.has("distractors")).isFalse();
        assertThat(first.get("options").size()).isEqualTo(3);
        assertThat(first.get("options").toString()).isEqualTo(question().get("options").toString());
        assertThat(first.get("options").toString()).doesNotContain("isCorrect");
        assertThat(first.get("audioText").asString()).isEqualTo("cat");
    }

    @Test
    void wrongAnswerRevealsCorrectOptionAndIsNotScoredTwice() {
        String correct = optionId("cat");
        String wrong = optionId("dog");
        JsonNode input = mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedOptionId":"%s"}
                """.formatted(wrong));
        var result = service.interact("session", "participant", input);
        assertThat(result.get("status")).isEqualTo("INCORRECT");
        assertThat(result.get("correctAnswer").toString()).contains(correct);
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
        assertThat(service.interact("session", "participant", input).get("totalScore")).isEqualTo(0);
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
    }

    @Test
    void correctAnswerScoresOnceAndUnknownOptionsAreRejected() {
        assertThatThrownBy(() -> service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedOptionId":"unknown"}
                """))).isInstanceOf(ApiException.class);
        String correct = optionId("cat");
        JsonNode input = mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedOptionId":"%s"}
                """.formatted(correct));
        var result = service.interact("session", "participant", input);
        assertThat(result.get("status")).isEqualTo("CORRECT");
        assertThat(((Number) result.get("pointsEarned")).intValue()).isGreaterThan(0);
        assertThat(service.interact("session", "participant", input).get("totalScore")).isEqualTo(result.get("totalScore"));
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
    }

    @Test
    void timeoutDoesNotRevealAnswerOrAwardPoints() {
        var result = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":30000,"outcome":"TIMEOUT"}
                """));
        assertThat(result.get("status")).isEqualTo("TIMEOUT");
        assertThat(result.get("correctAnswer")).isNull();
        assertThat(result.get("pointsEarned")).isEqualTo(0);
        assertThat(participant.getCompletedAt()).isNotNull();
    }

    @Test
    void skippedQuestionDoesNotRevealAnswerOrAwardPoints() {
        var result = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"outcome":"SKIPPED"}
                """));
        assertThat(result.get("status")).isEqualTo("SKIPPED");
        assertThat(result.get("correctAnswer")).isNull();
        assertThat(result.get("pointsEarned")).isEqualTo(0);
    }

    @Test
    void oversizedQuestionIdIsRejectedAsInvalidInput() {
        assertThatThrownBy(() -> service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q99999999999999999999999999999","timeSpentMs":1000,"selectedOptionId":"x"}
                """))).isInstanceOf(ApiException.class);
    }
}
