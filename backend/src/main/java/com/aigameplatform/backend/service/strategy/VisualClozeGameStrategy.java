package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class VisualClozeGameStrategy extends GameContentStrategy<VisualClozeQuestionDsl, VisualClozeQuestion> {

    public VisualClozeGameStrategy(JsonMapper jsonMapper) {
        super(VisualClozeQuestionDsl.class, VisualClozeQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn tạo game VISUAL_CLOZE: người học hoàn thành câu có một chỗ trống dựa trên ngữ cảnh học tập.
                Dùng sentenceTemplate với đúng một dấu ___, correctAnswer và distractors theo schema hiện có.
                Đáp án phải hoàn thành câu đúng và được YCCĐ hỗ trợ; distractors phải sai trong ngữ cảnh nhưng cùng mức độ.
                visualPrompt chỉ mô tả gợi ý hình ảnh mong muốn, không có nghĩa hình ảnh đã được tạo.
                Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Dùng từ và cấu trúc câu phù hợp " + grade
                + "; không yêu cầu suy luận từ một hình ảnh chưa hiện hữu hoặc kiến thức ngoài căn cứ.";
    }

    @Override
    protected VisualClozeQuestion toEntity(VisualClozeQuestionDsl dsl) {
        VisualClozeQuestion question = new VisualClozeQuestion();
        question.setSentenceTemplate(dsl.sentenceTemplate());
        question.setCorrectAnswer(dsl.correctAnswer());
        question.setDistractors(new ArrayList<>(dsl.distractors()));
        return question;
    }

    @Override
    protected VisualClozeQuestionDsl toDsl(VisualClozeQuestion entity, String questionId) {
        return new VisualClozeQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), entity.getSentenceTemplate(),
                entity.getCorrectAnswer(), List.copyOf(entity.getDistractors()));
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<VisualClozeQuestionDsl> questions) {
        return new VisualClozeGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.VISUAL_CLOZE, metadata,
                settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.VISUAL_CLOZE;
    }
}
