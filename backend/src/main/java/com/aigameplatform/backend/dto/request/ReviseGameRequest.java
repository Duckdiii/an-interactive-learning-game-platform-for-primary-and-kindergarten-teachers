package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.dto.understanding.ChatTurn;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** {@code ReviseGameRequest} của openapi.yaml: yêu cầu sửa mới nhất và các lượt chat sửa trước (tùy chọn). */
public record ReviseGameRequest(
        @NotBlank(message = "Vui lòng nhập yêu cầu sửa")
        @Size(max = 500, message = "Yêu cầu sửa tối đa 500 ký tự") String instruction,
        @Size(max = 10, message = "Cuộc trò chuyện quá dài, hãy bắt đầu lại") List<@NotNull @Valid ChatTurn> history) {
}
