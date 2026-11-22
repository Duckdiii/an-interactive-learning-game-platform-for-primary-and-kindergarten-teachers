package com.aigameplatform.backend.dto.understanding;

import com.aigameplatform.backend.entity.enums.GameType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Thẻ "Hệ thống hiểu như sau" ({@code GameUnderstanding} trong openapi.yaml). Ràng buộc chỉ kiểm thẻ client gửi lên; thẻ AI
 * trả về không qua Bean Validation mà được {@code GameUnderstandingService} chuẩn hóa về cùng giới hạn.
 */
public record GameUnderstanding(
        @NotNull @Size(max = 200) String learningGoal,
        @NotNull @Size(max = 200) String childAction,
        @NotNull @Size(max = 20) List<@NotNull @Size(max = 100) String> content,
        @NotNull @Size(max = 200) String setting,
        @NotNull GameType gameType,
        @NotNull @Size(max = 2) List<@NotNull GameType> alternativeGameTypes,
        @NotNull @Size(max = 5) List<@NotNull @Valid UnsupportedNeed> unsupported,
        @NotNull @Size(max = 5) List<@NotNull @Size(max = 200) String> assumptions) {

    /** Phần giáo viên muốn mà hệ thống chưa làm được, kèm phương án thay thế. */
    public record UnsupportedNeed(@NotNull @Size(max = 200) String need, @NotNull @Size(max = 200) String fallback) {
    }
}
