package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import java.util.List;

public record SessionResults(
        String sessionId,
        String gameTitle,
        String sessionName,
        SessionStatus status,
        List<ParticipantResultDto> participants,
        List<TeamResultDto> teams
) {
}
