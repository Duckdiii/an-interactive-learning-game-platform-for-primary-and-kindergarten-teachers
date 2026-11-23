package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.entity.question.SpotTheTargetQuestion;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.insight.SpotTheTargetWrongAnswerLabeler;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.SpotTheTargetGameStrategy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Spot the Target qua API học sinh: vùng đích không lộ, chấm theo bán kính, nhãn lỗi theo hướng lệch. */
class StudentPlaySpotTheTargetTest {

    private final GameRepository games = mock(GameRepository.class);
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameSessionRepository liveSessions = mock(GameSessionRepository.class);
    private final ParticipantRepository participants = mock(ParticipantRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final java.time.Instant[] now = {java.time.Instant.parse("2026-01-01T00:00:00Z")};
    private final java.time.Clock clock = new java.time.Clock() {
        @Override public java.time.ZoneId getZone() { return java.time.ZoneOffset.UTC; }
        @Override public java.time.Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public java.time.Instant instant() { return now[0]; }
    };
    private final StudentPlayService service = StudentPlayTestSupport.service(games, sessions, liveSessions,
            participants, strategies, mapper, new com.aigameplatform.backend.service.play.QuestionClock(clock));
    private final SpotTheTargetQuestion question = new SpotTheTargetQuestion();

    @BeforeEach
    void setup() {
        question.setTargetDescription("Con mèo");
        question.setHitRegionX(0.5);
        question.setHitRegionY(0.5);
        question.setHitRegionRadius(0.1);
        question.setId("db-q1");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        Game game = new Game();
        game.setGameType(GameType.SPOT_THE_TARGET);
        game.setSchemaVersion("1.1.0");
        game.setTitle("Tìm mèo");
        game.setSubject(Subject.VIETNAMESE);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));
        Participant participant = new Participant();
        participant.setId("participant");
        SelfSession session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("salt");
        session.setStatus(SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        doReturn(new SpotTheTargetGameStrategy(mapper)).when(strategies).get(GameType.SPOT_THE_TARGET);
        when(sessions.findById("session")).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private JsonNode tap(String xy) {
        return mapper.valueToTree(service.interact("session", "participant",
                mapper.readTree("{\"questionId\":\"q1\",\"timeSpentMs\":1000," + xy + "}")));
    }

    @Test
    void studentDoesNotSeeTheHitRegion() {
        JsonNode view = service.questions("session", "participant").get("questions").get(0);

        assertThat(view.has("hitRegion")).isFalse();
        assertThat(view.get("targetDescription").asString()).isEqualTo("Con mèo");
    }

    @Test
    void tapInsideTheRadiusIsCorrect() {
        JsonNode result = tap("\"x\":0.55,\"y\":0.5");

        assertThat(result.get("status").asString()).isEqualTo("CORRECT");
        assertThat(result.get("correctAnswer").get("radius").asDouble()).isEqualTo(0.1);
    }

    @Test
    void tapOutsideIsIncorrectAndRejectsBadCoordinates() {
        assertThat(tap("\"x\":0.9,\"y\":0.5").get("status").asString()).isEqualTo("INCORRECT");
    }

    @Test
    void coordinatesOutsideTheImageAreRejected() {
        assertThatThrownBy(() -> tap("\"x\":1.5,\"y\":0.5")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> tap("\"x\":\"0.5\",\"y\":0.5")).isInstanceOf(ApiException.class);
    }

    @Test
    void labelsFollowTheMissDirection() {
        SpotTheTargetWrongAnswerLabeler labeler = new SpotTheTargetWrongAnswerLabeler();
        assertThat(label(labeler, 0.65, 0.5)).contains("Gần đích (lệch sang phải)");
        assertThat(label(labeler, 0.5, 0.4)).contains("Gần đích (lệch lên trên)");
        assertThat(label(labeler, 0.9, 0.5)).contains("Xa đích (lệch sang phải)");
        assertThat(label(labeler, 0.1, 0.5)).contains("Xa đích (lệch sang trái)");
        assertThat(label(labeler, 0.5, 0.95)).contains("Xa đích (lệch xuống dưới)");
    }

    private Optional<String> label(SpotTheTargetWrongAnswerLabeler labeler, double x, double y) {
        return labeler.label(question, 0, "salt", mapper.readTree("{\"x\":" + x + ",\"y\":" + y + "}"));
    }

    @Test
    void serverTimeIsAFloorForTheClientClaim() {
        service.questions("session", "participant");
        now[0] = now[0].plusSeconds(60); // câu giới hạn 30 giây, client khai 1 giây
        JsonNode result = tap("\"x\":0.5,\"y\":0.5");

        assertThat(result.get("status").asString()).isEqualTo("TIMEOUT");
    }
}
