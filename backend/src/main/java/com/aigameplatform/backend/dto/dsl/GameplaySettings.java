package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;

/** hitboxScale do Backend gán theo khối lớp, AI không sinh. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record GameplaySettings(
        double hitboxScale) {
}
