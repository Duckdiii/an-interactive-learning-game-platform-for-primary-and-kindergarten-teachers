package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.SpotTheTargetGameDsl;
import com.aigameplatform.backend.dto.dsl.SpotTheTargetQuestionDsl;
import com.aigameplatform.backend.dto.dsl.ai.SpotTheTargetAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.SpotTheTargetAiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

@Component
public class SpotTheTargetGameDslFactory extends AbstractGameDslFactory<SpotTheTargetAiOutput,
        SpotTheTargetAiQuestion, SpotTheTargetQuestionDsl, SpotTheTargetGameDsl> {

    public SpotTheTargetGameDslFactory(RandomGenerator random) {
        super(GameType.SPOT_THE_TARGET, SpotTheTargetAiOutput.class, random);
    }

    @Override
    protected List<SpotTheTargetAiQuestion> aiQuestionsOf(SpotTheTargetAiOutput output) {
        return output.questions();
    }

    @Override
    protected SpotTheTargetQuestionDsl createQuestion(SpotTheTargetAiQuestion ai, QuestionBase base) {
        // Vùng bấm để trống: giáo viên chạm lên ảnh để chọn trong Workspace.
        return new SpotTheTargetQuestionDsl(base.id(), base.timeLimitSeconds(), base.points(), ai.audioText(), null,
                ai.visualPrompt(), null, ai.targetDescription(), null);
    }

    @Override
    protected SpotTheTargetGameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<SpotTheTargetQuestionDsl> questions) {
        return new SpotTheTargetGameDsl(schemaVersion(), supportedType(), metadata, settings, questions);
    }
}
