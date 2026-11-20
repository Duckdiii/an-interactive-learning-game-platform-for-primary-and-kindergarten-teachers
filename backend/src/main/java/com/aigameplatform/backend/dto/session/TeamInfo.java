package com.aigameplatform.backend.dto.session;

public record TeamInfo(
        String teamId,
        String teamName,
        String teamColor,
        int memberCount
) {
}
