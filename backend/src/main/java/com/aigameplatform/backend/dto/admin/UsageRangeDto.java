package com.aigameplatform.backend.dto.admin;

import java.time.Instant;

public record UsageRangeDto(
        Instant from,
        Instant to
) {
}
