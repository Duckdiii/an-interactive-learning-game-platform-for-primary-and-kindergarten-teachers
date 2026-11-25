package com.aigameplatform.backend.dto.admin;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BlockedWordsDto(
        @NotNull(message = "Danh sách từ cấm không được null")
        List<String> words
) {
    public BlockedWordsDto {
        if (words == null) {
            words = List.of();
        }
    }
}
