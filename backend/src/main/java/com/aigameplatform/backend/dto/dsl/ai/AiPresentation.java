package com.aigameplatform.backend.dto.dsl.ai;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Cách trình bày AI đề xuất (chuỗi tự do theo schema đầu ra); factory chỉ giữ giá trị có trong PresentationDsl. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiPresentation(String world, String carrier, String layout) {
}
