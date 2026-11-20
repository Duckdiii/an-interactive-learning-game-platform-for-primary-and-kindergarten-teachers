package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import java.util.List;

public record SessionDetail(
        String sessionId,
        String gameId,
        String gameTitle,
        String sessionName,
        SessionType sessionType,
        SessionStatus status,
        String accessCode,
        String createdAt,
        List<ParticipantDetailDto> participants,
        List<TeamInfo> teams
) {
}
