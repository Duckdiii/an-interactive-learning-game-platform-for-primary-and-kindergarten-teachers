package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.entity.enums.GameType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Chọn đúng strategy theo loại game (đa hình, không dùng switch). Thiếu strategy cho một loại là lỗi khi khởi động. */
@Component
public class GameContentStrategyRegistry {

    private final Map<GameType, GameContentStrategy<?, ?>> strategies = new EnumMap<>(GameType.class);

    public GameContentStrategyRegistry(List<GameContentStrategy<?, ?>> allStrategies) {
        for (GameContentStrategy<?, ?> strategy : allStrategies) {
            if (strategies.put(strategy.getSupportedType(), strategy) != null) {
                throw new IllegalStateException("Có hơn một strategy cho loại game " + strategy.getSupportedType());
            }
        }
        for (GameType type : GameType.values()) {
            if (!strategies.containsKey(type)) {
                throw new IllegalStateException("Chưa có strategy cho loại game " + type);
            }
        }
    }

    public GameContentStrategy<?, ?> get(GameType type) {
        return strategies.get(type);
    }
}
