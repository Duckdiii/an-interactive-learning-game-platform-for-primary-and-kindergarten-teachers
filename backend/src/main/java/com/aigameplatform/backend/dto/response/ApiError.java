package com.aigameplatform.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

public record ApiError(String code, String message,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) Map<String, String> details) {

    public ApiError(String code, String message) {
        this(code, message, null);
    }
}
