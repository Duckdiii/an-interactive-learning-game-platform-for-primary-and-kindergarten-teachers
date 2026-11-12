package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
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
        setPromptTemplate("""
                Bạn tạo game ODD_ONE_OUT: người học chọn một mục khác với các mục còn lại.
                Sinh DTO nội dung AI: items là mảng chuỗi và oddOneOutIndex là chỉ số bắt đầu từ 0 của mục khác biệt.
                Factory tự tạo định danh của DSL; không tự sinh ID. Tạo một tiêu chí phân loại rõ ràng:
                các mục còn lại cùng nhóm, chỉ một mục khác nhóm, và chỉ số phải trỏ đúng mục khác biệt.
                Sự khác biệt phải liên quan trực tiếp đến YCCĐ, không dựa vào chi tiết hình/âm thanh không được cung cấp.
                Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Tạo nhóm mục phù hợp chủ đề và YCCĐ ở " + grade
                + "; cần có đúng một mục khác biệt theo tiêu chí mà người học có thể nhận ra từ nội dung được cung cấp.";
    }

    @Override
    protected OddOneOutQuestion toEntity(OddOneOutQuestionDsl dsl) {
        // Kiểm tra oddOneOutId thuộc danh sách; entity giữ id này, còn id các mục luôn theo vị trí.
        ChoiceMapping.indexOfId(dsl.items(), dsl.oddOneOutId());
        OddOneOutQuestion question = new OddOneOutQuestion();
        if (dsl.items().stream().anyMatch(item -> item.assetId() != null || item.imageUrl() != null)) {
            question.setQuestionText(dsl.questionText());
            question.setImageItems(new ArrayList<>(dsl.items().stream().map(item ->
                    new com.aigameplatform.backend.entity.question.embedded.OddOneOutImageItem(
                            item.assetId(), item.text(), item.imageUrl())).toList()));
        } else {
            question.setItems(new ArrayList<>(ChoiceMapping.texts(dsl.items())));
        }
        question.setOddOneOutId(dsl.oddOneOutId());
        return question;
    }

    @Override
    protected OddOneOutQuestionDsl toDsl(OddOneOutQuestion entity, String questionId) {
        if (entity.getImageItems() != null && !entity.getImageItems().isEmpty()) {
            var items = new ArrayList<com.aigameplatform.backend.dto.dsl.TextChoiceDsl>();
            for (int i = 0; i < entity.getImageItems().size(); i++) {
                var item = entity.getImageItems().get(i);
                items.add(new com.aigameplatform.backend.dto.dsl.TextChoiceDsl(
                        com.aigameplatform.backend.service.factory.Ids.positional(i), item.getLabel(),
                        item.getAssetId(), item.getImageUrl()));
            }
            return new OddOneOutQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                    entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), items,
                    entity.getOddOneOutId(), entity.getQuestionText());
        }
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
    protected GameDsl assemble(com.aigameplatform.backend.entity.Game game, GameMetadata metadata,
            GameplaySettings settings, List<OddOneOutQuestionDsl> questions) {
        if (game.getOddOneOutMode() == OddOneOutMode.IMAGE)
            return new OddOneOutGameDsl(game.getSchemaVersion(), GameType.ODD_ONE_OUT, OddOneOutMode.IMAGE,
                    metadata, settings, questions);
        return assemble(metadata, settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.ODD_ONE_OUT;
    }
}
