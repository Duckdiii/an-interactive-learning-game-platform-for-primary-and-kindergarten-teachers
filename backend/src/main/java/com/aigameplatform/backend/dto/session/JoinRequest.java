package com.aigameplatform.backend.dto.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinRequest(
        @NotBlank @Size(min = 1, max = 20, message = "Nickname must be between 1 and 20 characters")
        String nickname,
        String teamId
) {
}
