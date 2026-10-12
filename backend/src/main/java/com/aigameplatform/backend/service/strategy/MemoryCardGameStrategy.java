package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.MemoryCardGameDsl;
import com.aigameplatform.backend.dto.dsl.MemoryCardQuestionDsl;
import com.aigameplatform.backend.dto.dsl.MemoryPairDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.MemoryCardQuestion;
import com.aigameplatform.backend.entity.question.embedded.MemoryPair;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MemoryCardGameStrategy extends GameContentStrategy<MemoryCardQuestionDsl, MemoryCardQuestion> {

    public MemoryCardGameStrategy(JsonMapper jsonMapper) {
        super(MemoryCardQuestionDsl.class, MemoryCardQuestion.class, jsonMapper);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, Subject subject, GradeLevel grade) {
        return "Môn: " + subjectLabel(subject) + ", " + gradeLabel(grade) + ". Chủ đề: " + topic
                + ". Tạo 2–8 thẻ ghép thành các cặp ghi nhớ; mỗi cặp phải dùng visualPrompt mô tả hình rõ ràng "
                + "và phân biệt được với các cặp còn lại.";
    }

    @Override
    protected MemoryCardQuestion toEntity(MemoryCardQuestionDsl dsl) {
        List<MemoryPair> pairs = new ArrayList<>();
        for (MemoryPairDsl pairDsl : dsl.pairs()) {
            MemoryPair pair = new MemoryPair();
            pair.setPairId(pairDsl.pairId());
            pair.setContent(ChoiceMapping.toEntity(pairDsl.content()));
            pairs.add(pair);
        }
        MemoryCardQuestion question = new MemoryCardQuestion();
        question.setPairs(pairs);
        return question;
    }

    @Override
    protected MemoryCardQuestionDsl toDsl(MemoryCardQuestion entity, String questionId) {
        List<MemoryPairDsl> pairs = entity.getPairs().stream()
                .map(pair -> new MemoryPairDsl(pair.getPairId(), ChoiceMapping.toDsl(pair.getContent())))
                .toList();
        return new MemoryCardQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), pairs);
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<MemoryCardQuestionDsl> questions) {
        return new MemoryCardGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.MEMORY_CARD, metadata, settings,
                questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.MEMORY_CARD;
    }
}
