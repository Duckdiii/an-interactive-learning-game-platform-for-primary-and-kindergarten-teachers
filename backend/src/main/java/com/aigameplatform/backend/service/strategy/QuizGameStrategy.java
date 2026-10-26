package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.service.factory.Ids;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class QuizGameStrategy extends GameContentStrategy<QuizQuestionDsl, QuizQuestion> {

    public QuizGameStrategy(JsonMapper jsonMapper) {
        super(QuizQuestionDsl.class, QuizQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn là trợ lý tạo câu hỏi trắc nghiệm Toán lớp 1 bằng tiếng Việt cho học sinh 6–7 tuổi.
                Tạo đúng 4 câu hỏi cho chủ đề được cung cấp. Mỗi câu có 4 lựa chọn khác nhau và đúng một đáp án.
                Tuân thủ căn cứ chương trình chính thức được cung cấp; giữ nguyên giới hạn số, phép tính và kỹ năng.
                Nếu căn cứ không hỗ trợ chủ đề, không tự suy diễn hoặc mở rộng kiến thức.
                Dùng ngữ cảnh ngắn, từ vựng quen thuộc, câu hỏi rõ ràng và phù hợp lứa tuổi.
                Chỉ tạo dữ liệu câu hỏi, không thêm lời dẫn ngoài JSON.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        if (grade != GradeLevel.GRADE_1) {
            throw new IllegalArgumentException("QUIZ RAG pilot only supports GRADE_1");
        }
        return "Chủ đề: " + topic + ". Mỗi câu hỏi có trường text, options (4 chuỗi), correctIndex (0–3); "
                + "có thể thêm visualPrompt hoặc audioText nếu cần. Không đưa đáp án vào nội dung câu hỏi.";
    }

    @Override
    protected QuizQuestion toEntity(QuizQuestionDsl dsl) {
        QuizQuestion question = new QuizQuestion();
        question.setText(dsl.questionText());
        question.setOptions(new ArrayList<>(ChoiceMapping.texts(dsl.options())));
        question.setCorrectIndex(ChoiceMapping.indexOfId(dsl.options(), dsl.correctOptionId()));
        return question;
    }

    @Override
    protected QuizQuestionDsl toDsl(QuizQuestion entity, String questionId) {
        return new QuizQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), entity.getText(),
                ChoiceMapping.withPositionalIds(entity.getOptions()), Ids.positional(entity.getCorrectIndex()));
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<QuizQuestionDsl> questions) {
        return new QuizGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.QUIZ, metadata, settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.QUIZ;
    }
}
