package com.aigameplatform.backend.dto.admin;

public record ServerMetricsDto(
        Double cpuUsagePercent,
        Double heapUsagePercent,
        Integer activeThreads
) {
}
