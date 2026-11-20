package com.aigameplatform.backend.dto.livearena;

import java.util.List;

public record LeaderboardUpdatedPayload(List<LeaderboardEntryDto> entries) {
}
