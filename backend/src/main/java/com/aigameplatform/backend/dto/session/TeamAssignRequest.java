package com.aigameplatform.backend.dto.session;

import jakarta.validation.constraints.NotBlank;

public record TeamAssignRequest(
        @NotBlank String teamId
) {
}
