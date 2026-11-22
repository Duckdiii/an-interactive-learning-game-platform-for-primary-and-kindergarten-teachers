package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.livearena.AnswerStatusPayload;
import com.aigameplatform.backend.dto.livearena.KickedPayload;
import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.dto.livearena.ParticipantsUpdatedPayload;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LiveArenaServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private SessionParticipantRegistry sessionParticipantRegistry;
    private LiveArenaService liveArenaService;

    @BeforeEach
    void setUp() {
        sessionParticipantRegistry = new SessionParticipantRegistry();
        liveArenaService = new LiveArenaService(messagingTemplate, sessionParticipantRegistry);
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
