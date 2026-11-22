package com.aigameplatform.backend.dto.admin;

import com.aigameplatform.backend.entity.enums.CostSource;
import com.aigameplatform.backend.entity.enums.ServiceName;
import com.aigameplatform.backend.entity.enums.ServiceStatus;

public record ServiceUsageDto(
        ServiceName service,
        int requests,
        int successCount,
        int failureCount,
        Integer tokensUsed,
        Double quotaUsedPercent,
        Double cost,
        String costCurrency,
        CostSource costSource,
        ServiceStatus status
) {
}
