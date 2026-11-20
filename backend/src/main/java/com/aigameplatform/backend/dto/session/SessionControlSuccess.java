package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.SessionStatus;

public record SessionControlSuccess(
        String sessionId,
        SessionStatus status
) {
}
