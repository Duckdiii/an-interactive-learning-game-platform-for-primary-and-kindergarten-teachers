package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.dto.media.SpeechVoice;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegenerateGameRequest(
        @Size(min = 10, max = 2000) @Pattern(regexp = "(?s).*\\S.*") String idea,
        @Size(max = 500) String feedback,
        SpeechVoice voice) {
}
