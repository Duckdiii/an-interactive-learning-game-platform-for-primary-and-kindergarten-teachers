package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.AudioVisualMatchQuestionDsl;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AudioVisualMatchGameStrategy
        extends GameContentStrategy<AudioVisualMatchQuestionDsl, AudioVisualMatchQuestion> {

    public AudioVisualMatchGameStrategy(JsonMapper jsonMapper) {
        super(AudioVisualMatchQuestionDsl.class, AudioVisualMatchQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn tạo game AUDIO_VISUAL_MATCH: người học đối chiếu nội dung nghe/nhìn với lựa chọn phù hợp.
                Dùng correct và distractors theo schema; mỗi lựa chọn là một mô tả hình ảnh có ID, đúng một lựa chọn khớp.
                Tạo mô tả ngắn, phân biệt được bằng căn cứ đã cho. audioText/visualPrompt chỉ là chỉ dẫn văn bản;
                không khẳng định đã có tệp âm thanh hay hình ảnh. Không biến cơ chế đối chiếu thành bộ câu hỏi trắc nghiệm chữ.
                Lựa chọn là từ phải là từ tiếng Việt có thật, đúng chính tả; không bịa từ vô nghĩa chỉ để có vần. Lựa chọn chỉ có chữ
                (không có hình đúng nghĩa) thì visualPrompt viết đúng dạng "Thẻ chữ <từ>" (ví dụ "Thẻ chữ cân"), không thêm chữ khác.
                Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Mục tiêu nghe/nhìn phải kiểm tra kỹ năng thuộc YCCĐ ở " + grade
                + "; lựa chọn đúng cần phân biệt rõ với distractors chỉ bằng thông tin sẽ được cung cấp cho người học.";
    }

    @Override
    protected AudioVisualMatchQuestion toEntity(AudioVisualMatchQuestionDsl dsl) {
        AudioVisualMatchQuestion question = new AudioVisualMatchQuestion();
        question.setCorrect(ChoiceMapping.toEntity(dsl.correct()));
        question.setDistractors(new ArrayList<>(dsl.distractors().stream().map(ChoiceMapping::toEntity).toList()));
        return question;
    }

    @Override
    protected AudioVisualMatchQuestionDsl toDsl(AudioVisualMatchQuestion entity, String questionId) {
        return new AudioVisualMatchQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(),
                entity.getAudioText(), entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                ChoiceMapping.toDsl(entity.getCorrect()),
                entity.getDistractors().stream().map(ChoiceMapping::toDsl).toList());
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<AudioVisualMatchQuestionDsl> questions) {
        return new AudioVisualMatchGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.AUDIO_VISUAL_MATCH,
                metadata, settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.AUDIO_VISUAL_MATCH;
    }
}
