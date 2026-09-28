package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.HitRegionDsl;
import com.aigameplatform.backend.dto.dsl.SpotTheTargetGameDsl;
import com.aigameplatform.backend.dto.dsl.SpotTheTargetQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.SpotTheTargetQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SpotTheTargetGameStrategy extends GameContentStrategy<SpotTheTargetQuestionDsl, SpotTheTargetQuestion> {

    public SpotTheTargetGameStrategy() {
        super(SpotTheTargetQuestionDsl.class, SpotTheTargetQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho SPOT_THE_TARGET");
    }

    @Override
    protected SpotTheTargetQuestion toEntity(SpotTheTargetQuestionDsl dsl) {
        SpotTheTargetQuestion question = new SpotTheTargetQuestion();
        question.setTargetDescription(dsl.targetDescription());
        // hitRegion có thể chưa có (bản nháp): giáo viên chạm ảnh để chọn sau.
        HitRegionDsl region = dsl.hitRegion();
        if (region != null) {
            question.setHitRegionX(region.x());
            question.setHitRegionY(region.y());
            question.setHitRegionRadius(region.radius());
        }
        return question;
    }

    @Override
    protected SpotTheTargetQuestionDsl toDsl(SpotTheTargetQuestion entity, String questionId) {
        boolean hasRegion = entity.getHitRegionX() != null && entity.getHitRegionY() != null
                && entity.getHitRegionRadius() != null;
        HitRegionDsl region = hasRegion
                ? new HitRegionDsl(entity.getHitRegionX(), entity.getHitRegionY(), entity.getHitRegionRadius())
                : null;
        return new SpotTheTargetQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(),
                entity.getAudioText(), entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                entity.getTargetDescription(), region);
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<SpotTheTargetQuestionDsl> questions) {
        return new SpotTheTargetGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.SPOT_THE_TARGET, metadata,
                settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.SPOT_THE_TARGET;
    }
}
