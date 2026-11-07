package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/**
 * {@code GenerateGameRequest} của openapi.yaml (bản JSON đồng bộ). Phải có ít nhất một trong {@code idea},
 * {@code randomTopic}; {@code CUSTOM} bắt buộc {@code idea}. Tệp giáo án và giọng đọc chưa cài: {@code voice} được nhận
 * nhưng bỏ qua.
 */
public record GenerateGameRequest(
        @NotNull(message = "Vui lòng chọn môn học") Subject subject,
        @NotNull(message = "Vui lòng chọn khối lớp") GradeLevel gradeLevel,
        @Size(min = 10, max = 2000, message = "Ý tưởng cần từ 10 đến 2000 ký tự") String idea,
        Boolean randomTopic,
        GameType gameType,
        JsonNode voice) {

    public boolean hasIdea() {
        return idea != null && !idea.isBlank();
    }

    public boolean wantsRandomTopic() {
        return Boolean.TRUE.equals(randomTopic);
    }
}
