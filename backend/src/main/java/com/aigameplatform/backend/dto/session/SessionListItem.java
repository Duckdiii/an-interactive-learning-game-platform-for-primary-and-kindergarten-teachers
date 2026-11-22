package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;

public record SessionListItem(
        String sessionId,
        String sessionName,
        SessionType sessionType,
        SessionStatus status,
        String accessCode,
        String createdAt,
        int participantCount
) {
}
