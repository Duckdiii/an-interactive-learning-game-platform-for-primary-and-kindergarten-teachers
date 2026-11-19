package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.livearena.AnswerStatusPayload;
import com.aigameplatform.backend.dto.livearena.KickedPayload;
import com.aigameplatform.backend.dto.livearena.LeaderboardEntryDto;
import com.aigameplatform.backend.dto.livearena.LeaderboardUpdatedPayload;
import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.dto.livearena.ParticipantsUpdatedPayload;
import com.aigameplatform.backend.entity.session.SessionParticipantScore;
import com.aigameplatform.backend.repository.SessionParticipantScoreRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LiveArenaService {

    private final SimpMessagingTemplate messagingTemplate;
    private final SessionParticipantRegistry sessionParticipantRegistry;
    private final LeaderboardRegistry leaderboardRegistry;
    private final SessionParticipantScoreRepository sessionParticipantScoreRepository;

    public LiveArenaService(
            SimpMessagingTemplate messagingTemplate,
            SessionParticipantRegistry sessionParticipantRegistry,
            LeaderboardRegistry leaderboardRegistry,
            SessionParticipantScoreRepository sessionParticipantScoreRepository) {
        this.messagingTemplate = messagingTemplate;
        this.sessionParticipantRegistry = sessionParticipantRegistry;
        this.leaderboardRegistry = leaderboardRegistry;
        this.sessionParticipantScoreRepository = sessionParticipantScoreRepository;
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

    public String getParticipantName(String sessionId, String participantId) {
        List<ParticipantDto> participants = sessionParticipantRegistry.getAll(sessionId);
        for (ParticipantDto p : participants) {
            if (p.id().equals(participantId)) {
                return p.name();
            }
        }
        return "Học sinh";
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

    public void broadcastLeaderboard(String sessionId) {
        List<LeaderboardRegistry.ScoreEntry> sorted = leaderboardRegistry.getSortedLeaderboard(sessionId);
        List<LeaderboardEntryDto> entries = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            LeaderboardRegistry.ScoreEntry entry = sorted.get(i);
            entries.add(new LeaderboardEntryDto(i + 1, entry.getParticipantName(), entry.getTotalScore()));
        }
        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/leaderboard",
                new LeaderboardUpdatedPayload(entries)
        );
    }

    @Transactional
    public void endSessionAndPersistScores(String sessionId) {
        List<LeaderboardRegistry.ScoreEntry> finalScores = leaderboardRegistry.getSortedLeaderboard(sessionId);

        if (sessionParticipantScoreRepository != null && !finalScores.isEmpty()) {
            List<SessionParticipantScore> entities = finalScores.stream()
                    .map(entry -> SessionParticipantScore.builder()
                            .sessionId(sessionId)
                            .participantId(entry.getParticipantId())
                            .participantName(entry.getParticipantName())
                            .finalScore(entry.getTotalScore())
                            .createdAt(LocalDateTime.now())
                            .build())
                    .toList();

            sessionParticipantScoreRepository.saveAll(entities);
        }
        leaderboardRegistry.clearSession(sessionId); // dọn bộ nhớ sau khi đã lưu xong
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
