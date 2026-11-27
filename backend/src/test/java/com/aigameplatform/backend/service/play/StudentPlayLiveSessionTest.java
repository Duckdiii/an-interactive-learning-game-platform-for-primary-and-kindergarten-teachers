package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import com.aigameplatform.backend.entity.session.GameSession;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SoloSession;
import com.aigameplatform.backend.entity.session.TeamSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.AudioVisualMatchGameStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Phiên Live Arena (SOLO/TEAM) nộp đáp án qua cùng API với chơi tự do và phải được lưu để thống kê (UC-18). */
class StudentPlayLiveSessionTest {
    private final SelfSessionRepository selfSessions = mock(SelfSessionRepository.class);
    private final GameSessionRepository liveSessions = mock(GameSessionRepository.class);
    private final ParticipantRepository participantRepo = mock(ParticipantRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final StudentPlayService service = StudentPlayTestSupport.service(
            mock(GameRepository.class), selfSessions, liveSessions, participantRepo, strategies, mapper);
    private Game game;
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
        game = new Game();
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
        doReturn(new AudioVisualMatchGameStrategy(mapper)).when(strategies).get(GameType.AUDIO_VISUAL_MATCH);
        when(liveSessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private static ImageChoice choice(String label) {
        var choice = new ImageChoice();
        choice.setVisualPrompt(label);
        choice.setImageUrl("https://images.example/" + label + ".png");
        return choice;
    }

    private void live(GameSession session, SessionStatus status) {
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("live-salt");
        session.setStatus(status);
        session.setParticipants(List.of(participant));
        when(liveSessions.findById("session")).thenReturn(Optional.of(session));
    }

    private String wrongOptionId() {
        for (JsonNode option : service.questions("session", "participant").get("questions").get(0).get("options")) {
            if ("dog".equals(option.get("visualPrompt").asString())) return option.get("id").asString();
        }
        throw new AssertionError("Missing option dog");
    }

    private JsonNode answer(String optionId) {
        return mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedOptionId":"%s"}
                """.formatted(optionId));
    }

    @Test
    void soloAndTeamAnswersArePersistedAsInteractionDetails() {
        for (GameSession session : List.of(new SoloSession(), new TeamSession())) {
            participant = new Participant();
            participant.setId("participant");
            live(session, SessionStatus.ACTIVE);

            var result = service.interact("session", "participant", answer(wrongOptionId()));

            assertThat(result.get("status")).isEqualTo("INCORRECT");
            assertThat(participant.getPlayInteractionDetails()).singleElement()
                    .satisfies(detail -> assertThat(detail.getStatus()).isEqualTo(InteractionStatus.INCORRECT));
            verify(liveSessions).save(session);
        }
        // Mỗi lần nộp bài khóa dòng học sinh một lần (không khóa cả phiên).
        verify(participantRepo, times(2)).findByIdForUpdate("participant");
        verify(selfSessions, never()).save(any());
    }

    @Test
    void participantRowIsLockedBeforeTheSessionIsLoaded() {
        live(new SoloSession(), SessionStatus.ACTIVE);

        service.interact("session", "participant", answer(wrongOptionId()));

        // Khóa sau khi đã nạp thì Hibernate giữ bản cũ của score và lượt trả lời, nên thứ tự này là bắt buộc.
        var order = org.mockito.Mockito.inOrder(participantRepo, liveSessions);
        order.verify(participantRepo).findByIdForUpdate("participant");
        order.verify(liveSessions).findById("session");
    }

    @Test
    void submittingTheSameQuestionTwiceKeepsOneRecord() {
        live(new SoloSession(), SessionStatus.ACTIVE);
        String wrong = wrongOptionId();

        service.interact("session", "participant", answer(wrong));
        service.interact("session", "participant", answer(wrong));

        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
    }

    @Test
    void liveSessionThatIsNotActiveRejectsAnswers() {
        var session = new SoloSession();
        live(session, SessionStatus.PAUSED);

        assertThatThrownBy(() -> service.interact("session", "participant", answer("x")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void studentOutsideTheLiveSessionIsRejected() {
        live(new SoloSession(), SessionStatus.ACTIVE);

        assertThatThrownBy(() -> service.interact("session", "someone-else", answer("x")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }
}
