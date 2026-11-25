package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.ChoosingStrategy;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import java.util.List;

public record SessionByCode(
        String sessionId,
        String gameTitle,
        SessionType sessionType,
        SessionStatus status,
        ChoosingStrategy groupingStrategy,
        List<TeamInfo> teams
) {
}
