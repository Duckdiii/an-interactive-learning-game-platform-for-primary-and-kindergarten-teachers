package com.aigameplatform.backend.dto.admin;

import java.util.List;

public record UsageReportDto(
        UsageRangeDto range,
        List<ServiceUsageDto> services,
        List<TimeseriesPointDto> timeseries
) {
}
