package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class SessionParticipantRegistry {

    private final Map<String, Map<String, ParticipantDto>> sessionParticipants = new ConcurrentHashMap<>();
    private final Map<String, String> sessionHosts = new ConcurrentHashMap<>();

    public void registerHost(String sessionId, String hostId) {
        if (sessionId != null && hostId != null) {
            sessionHosts.put(sessionId, hostId);
        }
    }

    public boolean isHost(String sessionId, String requesterId) {
        if (sessionId == null || requesterId == null) {
            return false;
        }
        String host = sessionHosts.get(sessionId);
        // Nếu host chưa đăng ký trước trong registry, mặc định cho phép test nếu requesterId không rỗng,
        // nhưng nếu đã đăng ký thì phải khớp chính xác.
        return host != null && host.equals(requesterId);
    }

    public void addOrUpdate(String sessionId, ParticipantDto participant) {
        if (sessionId == null || participant == null) return;
        sessionParticipants.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .put(participant.id(), participant);
    }

    public void remove(String sessionId, String participantId) {
        if (sessionId == null || participantId == null) return;
        Map<String, ParticipantDto> map = sessionParticipants.get(sessionId);
        if (map != null) {
            map.remove(participantId);
        }
    }

    public List<ParticipantDto> getAll(String sessionId) {
        if (sessionId == null) return Collections.emptyList();
        Map<String, ParticipantDto> map = sessionParticipants.get(sessionId);
        if (map == null) return Collections.emptyList();
        return new ArrayList<>(map.values());
    }

    public void clear(String sessionId) {
        sessionParticipants.remove(sessionId);
        sessionHosts.remove(sessionId);
    }
}
