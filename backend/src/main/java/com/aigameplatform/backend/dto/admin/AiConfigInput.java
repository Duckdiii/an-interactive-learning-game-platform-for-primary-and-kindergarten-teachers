package com.aigameplatform.backend.dto.admin;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AiConfigInput(
        @NotBlank(message = "System prompt không được để trống")
        String systemPrompt,

        @DecimalMin(value = "0.0", message = "Temperature tối thiểu là 0.0")
        @DecimalMax(value = "1.0", message = "Temperature tối đa là 1.0")
        Double temperature,

        @Min(value = 500, message = "maxTokens tối thiểu là 500")
        @Max(value = 4000, message = "maxTokens tối đa là 4000")
        Integer maxTokens,

        @DecimalMin(value = "0.0", message = "moderationThreshold tối thiểu là 0.0")
        @DecimalMax(value = "1.0", message = "moderationThreshold tối đa là 1.0")
        Double moderationThreshold
) {
    public Double resolvedTemperature() {
        return temperature != null ? temperature : 0.3;
    }

    public Integer resolvedMaxTokens() {
        return maxTokens != null ? maxTokens : 2000;
    }

    public Double resolvedModerationThreshold() {
        return moderationThreshold != null ? moderationThreshold : 0.85;
    }
}
