package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * {@code GenerateGameRequest} của openapi.yaml (bản JSON đồng bộ). Phải có ít nhất một trong {@code idea},
 * {@code randomTopic}; {@code CUSTOM} bắt buộc {@code idea}. {@code mode=IMAGE} chỉ dùng cho VISUAL_CLOZE (cần
 * {@code sceneImageUrl} và {@code optionImages}), ODD_ONE_OUT và AUDIO_VISUAL_MATCH (chọn hình từ thư viện Noto).
 * Tệp giáo án và giọng đọc chưa cài: {@code voice} được nhận nhưng bỏ qua.
 */
public record GenerateGameRequest(
        @NotNull(message = "Vui lòng chọn môn học") Subject subject,
        @NotNull(message = "Vui lòng chọn khối lớp") GradeLevel gradeLevel,
        @Size(min = 10, max = 2000, message = "Ý tưởng cần từ 10 đến 2000 ký tự") String idea,
        Boolean randomTopic,
        GameType gameType,
        VisualClozeMode mode,
        @Size(max = 2048) String sceneImageUrl,
        @Size(max = 8) List<@Valid OptionImage> optionImages,
        JsonNode voice) {

    public GenerateGameRequest(Subject subject, GradeLevel gradeLevel, String idea, Boolean randomTopic,
            GameType gameType, JsonNode voice) {
        this(subject, gradeLevel, idea, randomTopic, gameType, null, null, null, voice);
    }

    public record OptionImage(@NotBlank @Size(max = 2048) String imageUrl,
            @NotBlank @Size(max = 255) String visualPrompt) { }

    public boolean hasIdea() {
        return idea != null && !idea.isBlank();
    }

    public boolean wantsRandomTopic() {
        return Boolean.TRUE.equals(randomTopic);
    }

    public VisualClozeMode effectiveMode() {
        return mode == null ? VisualClozeMode.TEXT : mode;
    }
}
