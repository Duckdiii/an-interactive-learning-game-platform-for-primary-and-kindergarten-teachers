package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.ValidationReport;
import java.util.List;

public record GameGenerationResponse(
    GameDsl dsl,
    boolean valid,
    List<ValidationError> errors,
    long latencyMs
) {
    public GameGenerationResponse(GameDsl dsl, ValidationReport report, long latencyMs) {
        this(dsl, report != null && report.valid(), report != null ? report.errors() : List.of(), latencyMs);
    }
}
