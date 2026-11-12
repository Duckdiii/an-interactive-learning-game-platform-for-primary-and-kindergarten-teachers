package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record GenerateGameRequest(
        @NotNull Subject subject,
        @NotNull GradeLevel gradeLevel,
        @Size(min = 10, max = 2000) String idea,
        Boolean randomTopic,
        @NotNull GameType gameType,
        VisualClozeMode mode,
        @Size(max = 2048) String sceneImageUrl,
        @Size(max = 8) List<@Valid OptionImage> optionImages,
        @Valid Voice voice) {

    public GenerateGameRequest(Subject subject, GradeLevel gradeLevel, String idea, Boolean randomTopic,
            GameType gameType, VisualClozeMode mode, String sceneImageUrl, Voice voice) {
        this(subject, gradeLevel, idea, randomTopic, gameType, mode, sceneImageUrl, null, voice);
    }

    public record OptionImage(@NotBlank @Size(max = 2048) String imageUrl,
            @NotBlank @Size(max = 255) String visualPrompt) { }

    public record Voice(String region, String gender) { }

    public VisualClozeMode effectiveMode() {
        return mode == null ? VisualClozeMode.TEXT : mode;
    }
}
