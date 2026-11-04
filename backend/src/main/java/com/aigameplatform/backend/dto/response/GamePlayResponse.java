package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.entity.enums.GameType;

public record GamePlayResponse(
    String id,
    String title,
    GameType gameType,
    String shareCode,
    Object dsl
) {}
