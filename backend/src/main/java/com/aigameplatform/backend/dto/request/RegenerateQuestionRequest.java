package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.dto.media.SpeechVoice;
import jakarta.validation.constraints.Size;

public record RegenerateQuestionRequest(
        @Size(max = 500, message = "feedback cannot exceed 500 characters")
        String feedback, SpeechVoice voice
) {
    public RegenerateQuestionRequest() {
        this(null, null);
    }
}
