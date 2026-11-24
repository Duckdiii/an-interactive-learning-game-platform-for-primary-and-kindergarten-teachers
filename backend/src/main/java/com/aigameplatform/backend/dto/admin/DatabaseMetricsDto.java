package com.aigameplatform.backend.dto.admin;

import com.fasterxml.jackson.annotation.JsonInclude;

public record DatabaseMetricsDto(
        @JsonInclude(JsonInclude.Include.NON_NULL) Double poolUsagePercent
) {
}
