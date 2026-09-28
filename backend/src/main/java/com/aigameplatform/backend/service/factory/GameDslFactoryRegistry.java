package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Chọn đúng factory theo loại game (đa hình, không dùng switch). Thiếu factory cho một loại là lỗi khi khởi động. */
@Component
public class GameDslFactoryRegistry {

    private final Map<GameType, AbstractGameDslFactory<?, ?, ?, ?>> factories = new EnumMap<>(GameType.class);

    public GameDslFactoryRegistry(List<AbstractGameDslFactory<?, ?, ?, ?>> allFactories) {
        for (AbstractGameDslFactory<?, ?, ?, ?> factory : allFactories) {
            if (factories.put(factory.supportedType(), factory) != null) {
                throw new IllegalStateException("Có hơn một factory cho loại game " + factory.supportedType());
            }
        }
        for (GameType type : GameType.values()) {
            if (!factories.containsKey(type)) {
                throw new IllegalStateException("Chưa có factory cho loại game " + type);
            }
        }
    }

    public GameDsl create(GameType type, AiGameOutput output, GameDslRequest request) {
        return factories.get(type).create(output, request);
    }
}
