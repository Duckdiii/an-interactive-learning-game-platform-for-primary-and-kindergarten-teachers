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
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MatchingGameStrategy extends GameContentStrategy<MatchingQuestionDsl, MatchingQuestion> {

    public MatchingGameStrategy(JsonMapper jsonMapper) {
        super(MatchingQuestionDsl.class, MatchingQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn tạo game MATCHING: mỗi câu là một hoạt động nối hai vế thành các cặp có quan hệ rõ ràng.
                Sinh DTO nội dung AI: mỗi phần tử pairs chỉ có left và right, mỗi vế chứa text và/hoặc visualPrompt
                theo schema. Hệ thống tự thêm định danh khi factory tạo DSL; không tự sinh ID.
                Mỗi mục ở hai phía chỉ thuộc một cặp; quan hệ ghép phải đúng, không mơ hồ và được căn cứ bởi YCCĐ.
                Không biến hoạt động nối cặp thành câu hỏi nhiều lựa chọn. Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected boolean hasShortChoiceLabels() {
        return true;
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Tạo các cặp để người học nối khái niệm, từ, hình-mô tả hoặc biểu diễn tương đương "
                + "chỉ khi quan hệ đó nằm trong YCCĐ; dùng từ ngữ phù hợp " + grade + ". "
                + "Nếu giáo viên không nêu số lượng, tạo 3-5 câu, mỗi câu 3-6 cặp. "
                + "Hai vế của một cặp phải khác nhau về nội dung (từ ↔ nghĩa, số ↔ số lượng, chữ hoa ↔ chữ thường của một chữ cái); "
                + "text của hai vế không được là cùng một từ ('head' ↔ 'Head' là sai). Vế có visualPrompt vẫn bắt buộc có "
                + "text, và text đó phải khác vế kia (ví dụ 'cái đầu' ↔ 'head'). Khi bài là đếm hoặc nhận biết qua hình, "
                + "viết vế hình dạng 'N + tên vật' (ví dụ '3 con vịt') để hệ thống vẽ đúng N hình.";
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
