package com.aigameplatform.backend.dto.admin;

public record SystemStatusDto(
        ServerMetricsDto server,
        DatabaseMetricsDto database,
        LiveArenaMetricsDto liveArena
) {
}
