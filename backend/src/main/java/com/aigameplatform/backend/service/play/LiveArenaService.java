package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.livearena.AnswerStatusPayload;
import com.aigameplatform.backend.dto.livearena.KickedPayload;
import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.dto.livearena.ParticipantsUpdatedPayload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class LiveArenaService {

    private final SimpMessagingTemplate messagingTemplate;
    private final SessionParticipantRegistry sessionParticipantRegistry;

    public LiveArenaService(
            SimpMessagingTemplate messagingTemplate,
            SessionParticipantRegistry sessionParticipantRegistry) {
        this.messagingTemplate = messagingTemplate;
        this.sessionParticipantRegistry = sessionParticipantRegistry;
    }

    public void registerHost(String sessionId, String hostId) {
        sessionParticipantRegistry.registerHost(sessionId, hostId);
    }

    public void addParticipant(String sessionId, ParticipantDto participant) {
        sessionParticipantRegistry.addOrUpdate(sessionId, participant);
        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/participants",
                new ParticipantsUpdatedPayload(sessionParticipantRegistry.getAll(sessionId)));
    }

    public boolean isHost(String sessionId, String requesterId) {
        return sessionParticipantRegistry.isHost(sessionId, requesterId);
    }

    public void broadcastAnswerStatus(String sessionId, String participantId) {
        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/answer-status",
                new AnswerStatusPayload(participantId, true)
        );
    }

    public void kickParticipant(String sessionId, String requesterId, String participantId) {
        if (!isHost(sessionId, requesterId)) {
            throw new AccessDeniedException("Chỉ giáo viên mới được loại học sinh khỏi phiên");
        }

        sessionParticipantRegistry.remove(sessionId, participantId);

        // Báo riêng cho học sinh bị kick (ngắt kết nối phía client)
        messagingTemplate.convertAndSendToUser(
                participantId,
                "/queue/kicked",
                new KickedPayload(sessionId)
        );

        // Báo cho tất cả client còn lại cập nhật danh sách
        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/participants",
                new ParticipantsUpdatedPayload(sessionParticipantRegistry.getAll(sessionId))
        );
    }
}
