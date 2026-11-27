package com.aigameplatform.backend.dto.admin;

import com.fasterxml.jackson.annotation.JsonInclude;

public record ServerMetricsDto(
        @JsonInclude(JsonInclude.Include.NON_NULL) Double cpuUsagePercent,
        Double heapUsagePercent,
        Integer activeThreads
) {
}
