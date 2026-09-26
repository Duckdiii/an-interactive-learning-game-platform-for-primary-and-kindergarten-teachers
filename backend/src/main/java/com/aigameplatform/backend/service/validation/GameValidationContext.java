package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import tools.jackson.databind.JsonNode;

/** Dữ liệu dùng chung giữa các lớp kiểm duyệt: JSON thô và (sau Layer 1) game đã được đọc thành record. */
public class GameValidationContext {

    private final JsonNode json;
    private GameDsl game;

    public GameValidationContext(JsonNode json) {
        this.json = json;
    }

    public JsonNode getJson() {
        return json;
    }

    /** null cho tới khi Layer 1 đọc thành công. */
    public GameDsl getGame() {
        return game;
    }

    public void setGame(GameDsl game) {
        this.game = game;
    }
}
