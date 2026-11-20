package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import java.util.List;

public record CreateSessionResult(
        String sessionId,
        SessionType sessionType,
        String accessCode,
        String joinUrl,
        SessionStatus status,
        List<TeamInfo> teams
) {
}
