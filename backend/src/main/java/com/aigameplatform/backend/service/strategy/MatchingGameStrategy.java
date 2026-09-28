package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.MatchingGameDsl;
import com.aigameplatform.backend.dto.dsl.MatchingPairDsl;
import com.aigameplatform.backend.dto.dsl.MatchingQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.MatchingQuestion;
import com.aigameplatform.backend.entity.question.embedded.MatchingPair;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MatchingGameStrategy extends GameContentStrategy<MatchingQuestionDsl, MatchingQuestion> {

    public MatchingGameStrategy() {
        super(MatchingQuestionDsl.class, MatchingQuestion.class);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho MATCHING");
    }

    @Override
    protected MatchingQuestion toEntity(MatchingQuestionDsl dsl) {
        List<MatchingPair> pairs = new ArrayList<>();
        for (MatchingPairDsl pairDsl : dsl.pairs()) {
            MatchingPair pair = new MatchingPair();
            pair.setPairId(pairDsl.pairId());
            pair.setLeft(ChoiceMapping.toEntity(pairDsl.left()));
            pair.setRight(ChoiceMapping.toEntity(pairDsl.right()));
            pairs.add(pair);
        }
        MatchingQuestion question = new MatchingQuestion();
        question.setPairs(pairs);
        return question;
    }

    @Override
    protected MatchingQuestionDsl toDsl(MatchingQuestion entity, String questionId) {
        List<MatchingPairDsl> pairs = entity.getPairs().stream()
                .map(pair -> new MatchingPairDsl(pair.getPairId(), ChoiceMapping.toDsl(pair.getLeft()),
                        ChoiceMapping.toDsl(pair.getRight())))
                .toList();
        return new MatchingQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), pairs);
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<MatchingQuestionDsl> questions) {
        return new MatchingGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.MATCHING, metadata, settings,
                questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.MATCHING;
    }
}
