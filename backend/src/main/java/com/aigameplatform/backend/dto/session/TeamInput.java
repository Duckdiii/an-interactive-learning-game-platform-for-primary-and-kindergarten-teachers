package com.aigameplatform.backend.dto.session;

import jakarta.validation.constraints.NotBlank;

public record TeamInput(
        @NotBlank String teamName,
        String teamColor
) {
}
