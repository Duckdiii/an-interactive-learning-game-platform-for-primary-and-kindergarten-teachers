package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.dto.understanding.GameUnderstanding;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** {@code UnderstandGameRequest} của openapi.yaml. Tin cuối phải của giáo viên: kiểm ở service. */
public record UnderstandGameRequest(
        @NotNull(message = "Vui lòng chọn môn học") Subject subject,
        @NotNull(message = "Vui lòng chọn khối lớp") GradeLevel gradeLevel,
        @NotEmpty(message = "Vui lòng nhập mô tả bài học")
        @Size(max = 12, message = "Cuộc trò chuyện quá dài, hãy bắt đầu lại") List<@NotNull @Valid ChatTurn> messages,
        @Valid GameUnderstanding understanding) {
}
