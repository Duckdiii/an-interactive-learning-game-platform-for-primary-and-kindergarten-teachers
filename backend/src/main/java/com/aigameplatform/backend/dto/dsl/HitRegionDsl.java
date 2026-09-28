package com.aigameplatform.backend.dto.dsl;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Vùng đúng, tỉ lệ 0-1 so với ảnh. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HitRegionDsl(
        double x,
        double y,
        double radius) {
}
