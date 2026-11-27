package com.aigameplatform.backend.dto.understanding;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Một tin trong khung chat tạo game ({@code ChatTurn} trong openapi.yaml). */
public record ChatTurn(
        @NotNull(message = "Thiếu người gửi tin nhắn") Role role,
        @NotBlank(message = "Tin nhắn không được để trống")
        @Size(max = 2000, message = "Mỗi tin nhắn tối đa 2000 ký tự") String text) {

    public enum Role { TEACHER, ASSISTANT }
}
