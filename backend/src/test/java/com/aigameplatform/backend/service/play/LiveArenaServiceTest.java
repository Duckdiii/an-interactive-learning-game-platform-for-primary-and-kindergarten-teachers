package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.livearena.AnswerStatusPayload;
import com.aigameplatform.backend.dto.livearena.KickedPayload;
import com.aigameplatform.backend.dto.livearena.LeaderboardUpdatedPayload;
import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.dto.livearena.ParticipantsUpdatedPayload;
import com.aigameplatform.backend.entity.session.SessionParticipantScore;
import com.aigameplatform.backend.repository.SessionParticipantScoreRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LiveArenaServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private SessionParticipantScoreRepository scoreRepository;

    private SessionParticipantRegistry sessionParticipantRegistry;
    private LeaderboardRegistry leaderboardRegistry;
    private final QuestionClock questionClock = new QuestionClock(java.time.Clock.systemUTC());
    private LiveArenaService liveArenaService;

    @BeforeEach
    void setUp() {
        sessionParticipantRegistry = new SessionParticipantRegistry();
        leaderboardRegistry = new LeaderboardRegistry();
        liveArenaService = new LiveArenaService(
                messagingTemplate,
                sessionParticipantRegistry,
                leaderboardRegistry,
                scoreRepository,
                new ScoringService(),
                questionClock
        );
    }

    @Test
    @DisplayName("recordAnswer chấm điểm theo giờ server, câu gửi lại không cộng thêm, chưa tải đề thì không cộng")
    void testRecordAnswerUsesServerClockAndIgnoresResubmit() {
        String sessionId = "session-score";
        sessionParticipantRegistry.addOrUpdate(sessionId, new ParticipantDto("p1", "Bé Lan", true));

        liveArenaService.recordAnswer(sessionId, "p1", "q1", true); // chưa start: bỏ qua
        assertThat(leaderboardRegistry.getSortedLeaderboard(sessionId)).isEmpty();

        liveArenaService.startQuestionClock(sessionId, "p1");
        liveArenaService.recordAnswer(sessionId, "p1", "q1", true);
        liveArenaService.recordAnswer(sessionId, "p1", "q1", true); // gửi lại

        List<LeaderboardRegistry.ScoreEntry> board = leaderboardRegistry.getSortedLeaderboard(sessionId);
        assertThat(board).hasSize(1);
        // Trả lời gần như tức thì theo đồng hồ server => gần điểm tối đa, và chỉ cộng một lần
        assertThat(board.get(0).getTotalScore()).isBetween(990, ScoringService.BASE_POINTS);
    }

    @Test
    @DisplayName("endSessionAndPersistScores dọn cả đồng hồ câu hỏi của phiên")
    void testEndSessionClearsQuestionClock() {
        liveArenaService.startQuestionClock("session-clock", "p1");
        liveArenaService.endSessionAndPersistScores("session-clock");

        assertThat(questionClock.lap("session-clock", "p1", "q1")).isEmpty();
    }

    @Test
    @DisplayName("broadcastAnswerStatus gửi AnswerStatusPayload(true) tới /topic/session/{sessionId}/answer-status")
    void testBroadcastAnswerStatus() {
        String sessionId = "session-123";
        String participantId = "student-abc";

        liveArenaService.broadcastAnswerStatus(sessionId, participantId);

        ArgumentCaptor<AnswerStatusPayload> captor = ArgumentCaptor.forClass(AnswerStatusPayload.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/session/session-123/answer-status"),
                captor.capture()
        );

        AnswerStatusPayload payload = captor.getValue();
        assertThat(payload.participantId()).isEqualTo("student-abc");
        assertThat(payload.answered()).isTrue();
    }

    @Test
    @DisplayName("broadcastLeaderboard phát danh sách đã sắp xếp tới /topic/session/{sessionId}/leaderboard")
    void testBroadcastLeaderboard() {
        String sessionId = "session-board";
        leaderboardRegistry.addScore(sessionId, "p1", "Bé Lan", 500);
        leaderboardRegistry.addScore(sessionId, "p2", "Bé Hùng", 850);

        liveArenaService.broadcastLeaderboard(sessionId);

        ArgumentCaptor<LeaderboardUpdatedPayload> captor =
                ArgumentCaptor.forClass(LeaderboardUpdatedPayload.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/session/session-board/leaderboard"),
                captor.capture()
        );

        LeaderboardUpdatedPayload payload = captor.getValue();
        assertThat(payload.entries()).hasSize(2);
        // Hạng 1: Bé Hùng 850
        assertThat(payload.entries().get(0).rank()).isEqualTo(1);
        assertThat(payload.entries().get(0).name()).isEqualTo("Bé Hùng");
        assertThat(payload.entries().get(0).score()).isEqualTo(850);
        // Hạng 2: Bé Lan 500
        assertThat(payload.entries().get(1).rank()).isEqualTo(2);
        assertThat(payload.entries().get(1).name()).isEqualTo("Bé Lan");
        assertThat(payload.entries().get(1).score()).isEqualTo(500);
    }

    @Test
    @DisplayName("endSessionAndPersistScores lưu snapshot xuống DB và dọn sạch leaderboard in-memory")
    void testEndSessionAndPersistScores() {
        String sessionId = "session-end";
        leaderboardRegistry.addScore(sessionId, "p1", "Bé Lan", 950);

        liveArenaService.endSessionAndPersistScores(sessionId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SessionParticipantScore>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(scoreRepository).saveAll(captor.capture());

        List<SessionParticipantScore> saved = captor.getValue();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getSessionId()).isEqualTo("session-end");
        assertThat(saved.get(0).getParticipantId()).isEqualTo("p1");
        assertThat(saved.get(0).getFinalScore()).isEqualTo(950);

        // Đã dọn sạch khỏi registry (không leak memory)
        assertThat(leaderboardRegistry.getSortedLeaderboard(sessionId)).isEmpty();
    }

    @Test
    @DisplayName("endSessionAndPersistScores dọn danh sách học sinh và host của phiên")
    void testEndSessionClearsParticipantRegistry() {
        liveArenaService.registerHost("session-reg", "teacher-1");
        sessionParticipantRegistry.addOrUpdate("session-reg", new ParticipantDto("p1", "Bé Lan", true));

        liveArenaService.endSessionAndPersistScores("session-reg");

        assertThat(sessionParticipantRegistry.getAll("session-reg")).isEmpty();
        assertThat(sessionParticipantRegistry.isHost("session-reg", "teacher-1")).isFalse();
    }

    @Test
    @DisplayName("endSessionAndPersistScores lưu đủ mọi học sinh, giữ tên và điểm của từng người")
    void testEndSessionPersistsEveryParticipant() {
        String sessionId = "session-multi";
        leaderboardRegistry.addScore(sessionId, "p1", "Bé Lan", 600);
        leaderboardRegistry.addScore(sessionId, "p1", "Bé Lan", 400);
        leaderboardRegistry.addScore(sessionId, "p2", "Bé Hùng", 700);
        leaderboardRegistry.addScore("session-other", "p9", "Bé Khác", 100);

        liveArenaService.endSessionAndPersistScores(sessionId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SessionParticipantScore>> captor = ArgumentCaptor.forClass(List.class);
        verify(scoreRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(SessionParticipantScore::getParticipantId,
                        SessionParticipantScore::getParticipantName,
                        SessionParticipantScore::getFinalScore)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("p1", "Bé Lan", 1000),
                        org.assertj.core.groups.Tuple.tuple("p2", "Bé Hùng", 700));
        assertThat(captor.getValue()).allSatisfy(s -> assertThat(s.getCreatedAt()).isNotNull());
        // Phiên khác không bị đụng tới
        assertThat(leaderboardRegistry.getSortedLeaderboard("session-other")).hasSize(1);
    }

    @Test
    @DisplayName("endSessionAndPersistScores với phiên chưa có điểm: không gọi saveAll")
    void testEndSessionWithoutScoresSavesNothing() {
        liveArenaService.endSessionAndPersistScores("session-empty");

        verify(scoreRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("kickParticipant bởi Host thành công: xoá registry, báo private queue và broadcast danh sách mới")
    void testKickParticipantByHost() {
        String sessionId = "session-456";
        String hostId = "teacher-1";
        String student1Id = "student-1";
        String student2Id = "student-2";

        liveArenaService.registerHost(sessionId, hostId);
        sessionParticipantRegistry.addOrUpdate(sessionId, new ParticipantDto(student1Id, "Bé An", true));
        sessionParticipantRegistry.addOrUpdate(sessionId, new ParticipantDto(student2Id, "Bé Bình", true));

        // Giáo viên host kick student1
        liveArenaService.kickParticipant(sessionId, hostId, student1Id);

        // Đã xoá student-1 khỏi registry
        assertThat(sessionParticipantRegistry.getAll(sessionId))
                .extracting(ParticipantDto::id)
                .containsExactly(student2Id);

        // Báo riêng cho student1 qua user destination /queue/kicked
        ArgumentCaptor<KickedPayload> kickCaptor = ArgumentCaptor.forClass(KickedPayload.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq(student1Id),
                eq("/queue/kicked"),
                kickCaptor.capture()
        );
        assertThat(kickCaptor.getValue().sessionId()).isEqualTo(sessionId);

        // Broadcast danh sách còn lại
        ArgumentCaptor<ParticipantsUpdatedPayload> updateCaptor =
                ArgumentCaptor.forClass(ParticipantsUpdatedPayload.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/session/session-456/participants"),
                updateCaptor.capture()
        );
        assertThat(updateCaptor.getValue().participants())
                .extracting(ParticipantDto::id)
                .containsExactly(student2Id);
    }

    @Test
    @DisplayName("kickParticipant bởi tài khoản không phải Host: ném AccessDeniedException")
    void testKickParticipantByNonHostThrowsException() {
        String sessionId = "session-789";
        String hostId = "teacher-1";
        String nonHostId = "student-imposter";
        String victimId = "student-victim";

        liveArenaService.registerHost(sessionId, hostId);
        liveArenaService.addParticipant(sessionId, new ParticipantDto(victimId, "Bé Hoa", true));

        assertThatThrownBy(() -> liveArenaService.kickParticipant(sessionId, nonHostId, victimId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Chỉ giáo viên mới được loại học sinh khỏi phiên");

        // Học sinh không bị xoá
        assertThat(sessionParticipantRegistry.getAll(sessionId)).hasSize(1);
    }
}
