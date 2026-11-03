package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.WordScrambleGameDsl;
import com.aigameplatform.backend.dto.dsl.WordScrambleQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.WordScrambleQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class WordScrambleGameStrategy extends GameContentStrategy<WordScrambleQuestionDsl, WordScrambleQuestion> {

    public WordScrambleGameStrategy(JsonMapper jsonMapper) {
        super(WordScrambleQuestionDsl.class, WordScrambleQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn tạo game WORD_SCRAMBLE để người học sắp xếp các chữ cái thành từ đích.
                Dùng correctWord và scrambledLetters đúng schema. scrambledLetters phải chứa chính xác các chữ cái của
                correctWord, không thêm/bớt/thay chữ; correctWord phải là từ có nghĩa và thuộc nội dung được dạy.
                Giữ đúng dấu và chữ cái tiếng Việt nếu môn học yêu cầu. Không dùng định nghĩa cần kiến thức ngoài YCCĐ.
                Chỉ trả JSON theo schema.
                """);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Chọn từ đích và gợi ý văn bản ngắn phù hợp YCCĐ ở " + grade
                + "; không yêu cầu người học xáo/sắp xếp biểu thức hoặc kiến thức ngoài phạm vi.";
    }

    @Override
    protected WordScrambleQuestion toEntity(WordScrambleQuestionDsl dsl) {
        WordScrambleQuestion question = new WordScrambleQuestion();
        question.setCorrectWord(dsl.correctWord());
        question.setScrambledLetters(new ArrayList<>(dsl.scrambledLetters()));
        return question;
    }

    @Override
    protected WordScrambleQuestionDsl toDsl(WordScrambleQuestion entity, String questionId) {
        return new WordScrambleQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(),
                entity.getAudioText(), entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                entity.getCorrectWord(), List.copyOf(entity.getScrambledLetters()));
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<WordScrambleQuestionDsl> questions) {
        return new WordScrambleGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.WORD_SCRAMBLE, metadata,
                settings, questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.WORD_SCRAMBLE;
    }
}
