package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Flattened teacher response: the saved DSL plus server-owned management fields. */
public final class GameResponse {
    private GameResponse() { }

    public static ObjectNode from(Game game, GameContentStrategyRegistry strategies, JsonMapper mapper) {
        GameDsl dsl = strategies.get(game.getGameType()).toGameDsl(game);
        ObjectNode response = mapper.valueToTree(dsl);
        response.put("gameId", game.getId());
        response.put("status", game.getStatus().name());
        if (game.getUpdatedAt() != null) response.put("updatedAt", game.getUpdatedAt().toString());
        return response;
    }

    public static ObjectNode withEnvelope(Game game, GameDsl dsl, JsonMapper mapper) {
        ObjectNode response = mapper.valueToTree(dsl);
        response.put("gameId", game.getId());
        response.put("status", game.getStatus().name());
        if (game.getUpdatedAt() != null) response.put("updatedAt", game.getUpdatedAt().toString());
        return response;
    }
}
