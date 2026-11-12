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
                Bạn tạo nội dung cho game QUIZ theo đúng môn, lớp/độ tuổi và chủ đề trong yêu cầu.
                Mỗi câu dùng các trường của schema hiện có: text, options và correctIndex.
                Mỗi câu phải có một đáp án đúng duy nhất; lựa chọn sai phải hợp lý nhưng không được đồng thời đúng.
                Lời đọc (audioText, tùy chọn) chỉ đọc lại câu hỏi, KHÔNG nói ra đáp án đúng. Câu có chỗ trống thì đọc chỗ trống là
                "chỗ trống" (ví dụ câu "3 ... 8" không được đọc thành "3 nhỏ hơn 8"); không chắc thì bỏ hẳn audioText.
                Viết câu rõ, phù hợp độ tuổi và ngôn ngữ của môn học. Không mặc định môn Toán, lớp 1 hay một số lượng
                lựa chọn cố định ngoài các ràng buộc được nêu trong schema.
                Chỉ trả dữ liệu theo schema JSON, không thêm lời dẫn.
                """);
    }

    @Override
    protected boolean hasShortChoiceLabels() {
        return true;
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        String instruction = "Chủ đề cần dạy: " + topic + ". Dùng correctIndex để trỏ tới đáp án duy nhất trong options. "
                + "Bảo đảm nội dung câu hỏi thực sự kiểm tra kỹ năng được yêu cầu ở " + grade
                + "; không chuyển sang kỹ năng khác hoặc dựa vào hình/âm thanh chưa có trong dữ liệu.";
        if (grade == GradeLevel.KINDERGARTEN) {
            instruction += """

                    Với Mầm non, viết lời dẫn ngắn và các lựa chọn ngắn để giáo viên đọc cho trẻ nghe;
                    không yêu cầu trẻ tự đọc nhiều, không giả định đã có ảnh hoặc tệp âm thanh.
                    Câu hỏi phân loại phải nêu đủ dữ kiện để có đúng một đáp án, không suy chất liệu từ tên đồ vật.
                    Nếu đáp án là đồ gỗ, phải nói rõ các vật làm bằng gỗ trong lời dẫn, ví dụ 'cái ghế làm bằng gỗ'.
                    Tên bàn, ghế, tủ, giường tự nó chưa chứng minh vật bằng gỗ. Không dùng hình chưa được cung cấp
                    hoặc kiến thức về vật liệu thường gặp để bù dữ kiện thiếu.
                    """;
        }
        return instruction;
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
