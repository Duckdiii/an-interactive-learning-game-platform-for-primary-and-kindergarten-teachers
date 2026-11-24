package com.aigameplatform.backend.dto.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinRequest(
        @NotBlank(message = "Hãy nhập biệt danh")
        @Size(min = 1, max = 20, message = "Biệt danh phải có độ dài từ 1 đến 20 ký tự")
        String nickname,
        String teamId
) {
}
