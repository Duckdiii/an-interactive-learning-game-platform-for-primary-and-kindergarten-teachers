package com.aigameplatform.backend.dto.request;

import jakarta.validation.constraints.Size;

public record RegenerateQuestionRequest(
        @Size(max = 500, message = "feedback cannot exceed 500 characters")
        String feedback
) {
    public RegenerateQuestionRequest() {
        this(null);
    }
}
