package com.aigameplatform.backend.dto.session;

import java.util.List;

public record LeaderboardDto(
        List<LeaderboardParticipantDto> participants,
        List<LeaderboardTeamDto> teams
) {
}
