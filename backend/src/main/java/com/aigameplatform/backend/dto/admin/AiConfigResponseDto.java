package com.aigameplatform.backend.dto.admin;

import java.util.List;

public record AiConfigResponseDto(
        AiConfigVersionDto active,
        List<AiConfigVersionDto> versions
) {
}
