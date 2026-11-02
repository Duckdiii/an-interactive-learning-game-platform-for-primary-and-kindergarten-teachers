package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.MemoryCardGameDsl;
import com.aigameplatform.backend.dto.dsl.MemoryCardQuestionDsl;
import com.aigameplatform.backend.dto.dsl.MemoryPairDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
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
        setPromptTemplate("""
                Bạn tạo game MEMORY_CARD để người chơi lật thẻ và tìm hai thẻ tạo thành một cặp.
                Sinh DTO nội dung AI: mỗi phần tử pairs là một object phẳng chứa visualPrompt và text tùy chọn,
                mô tả mặt hiển thị chung của một cặp thẻ. Factory tự tạo định danh và cấu trúc DSL; không tự sinh ID
                hoặc bọc thêm object. Nội dung giữa các cặp khác nhau cần phân biệt rõ để tránh ghép mơ hồ.
                Nội dung ngắn gọn, phù hợp độ tuổi; không tạo câu hỏi trắc nghiệm. Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Mỗi cặp thẻ phải giúp luyện đúng một quan hệ hoặc nội dung thuộc YCCĐ ở " + grade
                + "; không dùng kiến thức ngoài căn cứ để tạo cặp.";
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
