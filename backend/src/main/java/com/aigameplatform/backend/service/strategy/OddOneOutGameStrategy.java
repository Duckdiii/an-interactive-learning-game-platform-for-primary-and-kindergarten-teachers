package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OddOneOutGameStrategy extends GameContentStrategy<OddOneOutQuestionDsl, OddOneOutQuestion> {

    public OddOneOutGameStrategy(JsonMapper jsonMapper) {
        super(OddOneOutQuestionDsl.class, OddOneOutQuestion.class, jsonMapper);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho ODD_ONE_OUT");
    }

    @Override
    protected OddOneOutQuestion toEntity(OddOneOutQuestionDsl dsl) {
        // Kiểm tra oddOneOutId thuộc danh sách; entity giữ id này, còn id các mục luôn theo vị trí.
        ChoiceMapping.indexOfId(dsl.items(), dsl.oddOneOutId());
        OddOneOutQuestion question = new OddOneOutQuestion();
        question.setItems(new ArrayList<>(ChoiceMapping.texts(dsl.items())));
        question.setOddOneOutId(dsl.oddOneOutId());
        return question;
    }

    @Override
    protected OddOneOutQuestionDsl toDsl(OddOneOutQuestion entity, String questionId) {
        return new OddOneOutQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                ChoiceMapping.withPositionalIds(entity.getItems()), entity.getOddOneOutId());
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<OddOneOutQuestionDsl> questions) {
        return new OddOneOutGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.ODD_ONE_OUT, metadata, settings,
                questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.ODD_ONE_OUT;
    }
}
