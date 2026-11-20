package com.aigameplatform.backend.dto.admin;

public record LiveArenaMetricsDto(
        Integer activeSessions,
        Integer connectedClients
) {
}
