package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.GenerationScopeUnsupportedException;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.curriculum.CurriculumTopicParser;
import com.aigameplatform.backend.service.curriculum.CurriculumConstraints;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** First production generator adapter: the reviewed RAG pilot's QUIZ / Mathematics Grade 1 vertical slice. */
@Component
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
public class GeminiGameContentGenerator implements GameContentGenerator {

    private static final String VERIFIED_ARITHMETIC_FORMAT = """
            ĐỊNH DẠNG KIỂM CHỨNG CHO PHÉP CỘNG/TRỪ CỦA PILOT:
            Giữ nguyên kỹ năng và phạm vi trong yêu cầu của giáo viên. Mỗi questionText phải ghi đúng một phép tính
            bằng chữ số và ký hiệu + hoặc -, ví dụ `2 + 3 = ?` hoặc `5 - 2 = ?`; không viết phép tính bằng chữ
            (như “2 cộng 3”) và không chuyển thành bài toán kể chuyện. Mỗi options.text chỉ là một số nguyên dạng chữ số,
            và correctIndex phải trỏ tới đúng kết quả duy nhất. Đây chỉ là cách trình bày cùng phép tính được yêu cầu,
            không được đổi chủ đề, kỹ năng, giới hạn số hoặc thêm phép tính.
            """;

    private final ChatModel model;
    private final GameContentStrategyRegistry strategies;
    private final CurriculumTopicParser topicParser = new CurriculumTopicParser();

    public GeminiGameContentGenerator(
            @org.springframework.beans.factory.annotation.Qualifier("gameGenerationChatModel") ChatModel model,
            GameContentStrategyRegistry strategies) {
        this.model = model;
        this.strategies = strategies;
    }

    @Override
    public String generate(GenerationAttempt attempt) {
        if (attempt.gameType() != GameType.QUIZ || attempt.subject() != Subject.MATH
                || attempt.gradeLevel() != GradeLevel.GRADE_1) {
            throw new GenerationScopeUnsupportedException(
                    "Gemini generation pilot currently supports QUIZ / Mathematics Grade 1");
        }
        GameContentStrategy<?, ?> strategy = strategies.get(attempt.gameType());
        String systemPrompt = strategy.buildPrompt(attempt.topic(), attempt.gradeLevel(), attempt.curriculumContext());
        String arithmeticInstruction = explicitArithmeticInstruction(attempt);
        if (arithmeticInstruction != null) systemPrompt += "\n\n" + arithmeticInstruction;
        String userPrompt = attempt.isRetry()
                ? retryPrompt(attempt)
                : "Tạo nội dung game theo yêu cầu trong system prompt. Chỉ trả về JSON theo schema đã cung cấp.";
        ResponseFormat schemaFormat = ResponseFormat.builder().type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder().rootElement(JsonRawSchema.builder()
                        .schema(attempt.structuredSchema()).build()).build()).build();
        ChatRequestParameters parameters = ChatRequestParameters.builder().responseFormat(schemaFormat).build();
        try {
            var response = model.chat(ChatRequest.builder()
                    .messages(SystemMessage.from(systemPrompt), UserMessage.from(userPrompt))
                    .parameters(parameters).build());
            if (response == null || response.aiMessage() == null || response.aiMessage().text() == null) {
                throw new AiServiceUnavailableException("Gemini returned an empty response");
            }
            return response.aiMessage().text();
        } catch (AiServiceUnavailableException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AiServiceUnavailableException("Gemini request failed", exception);
        }
    }

    private String retryPrompt(GenerationAttempt attempt) {
        String errors = attempt.previousErrors().stream()
                .map(error -> error.path() + ": " + error.message()).collect(java.util.stream.Collectors.joining("\n"));
        String arithmeticInstruction = explicitArithmeticInstruction(attempt);
        boolean mentalArithmeticRequested = arithmeticInstruction != null
                && topicParser.parse(attempt.topic()).requirements().stream()
                        .anyMatch(CurriculumTopicParser.Requirement::mental);
        String machineCheckGuidance = arithmeticInstruction != null && attempt.previousErrors().stream()
                .anyMatch(error -> "QUESTION_NOT_MACHINE_CHECKABLE".equals(error.message()))
                ? "\nRiêng câu không kiểm tra được: viết lại bằng đúng một biểu thức số học tường minh với chữ số và ký hiệu + hoặc - "
                        + "(ví dụ 2 + 3 = ?); không đổi kỹ năng/phạm vi giáo viên yêu cầu và không dùng bài toán kể chuyện.\n"
                : "";
        String mentalArithmeticGuidance = mentalArithmeticRequested && attempt.previousErrors().stream()
                .anyMatch(error -> "MENTAL_ARITHMETIC_NOT_EXPLICIT_IN_QUESTION".equals(error.message()))
                ? "\nYêu cầu là tính nhẩm: đặt cụm `Tính nhẩm:` trong questionText trước biểu thức, ví dụ `Tính nhẩm: 2 + 3 = ?`; giữ nguyên phép tính và phạm vi.\n"
                : "";
        return "Sửa JSON lần trước theo đúng schema. Không thay đổi căn cứ chương trình đã nêu trong system prompt.\n"
                + "Lỗi cần sửa:\n" + errors + machineCheckGuidance + mentalArithmeticGuidance
                + "\nJSON trước:\n" + attempt.previousOutput()
                + "\nChỉ trả về JSON đã sửa.";
    }

    private String explicitArithmeticInstruction(GenerationAttempt attempt) {
        if (attempt.gameType() != GameType.QUIZ || attempt.subject() != Subject.MATH
                || attempt.gradeLevel() != GradeLevel.GRADE_1
                || attempt.curriculumContext() == null || attempt.curriculumContext().isBlank()) return null;
        CurriculumTopicParser.ParsedTopic parsed = topicParser.parse(attempt.topic());
        if (parsed.needsClarification() || parsed.requirements().isEmpty()
                || !parsed.requirements().stream().allMatch(requirement ->
                        requirement.skill() == CurriculumConstraints.Skill.ADD
                                || requirement.skill() == CurriculumConstraints.Skill.SUBTRACT)) return null;
        String instruction = VERIFIED_ARITHMETIC_FORMAT;
        if (parsed.requirements().stream().anyMatch(CurriculumTopicParser.Requirement::mental)) {
            instruction += " Với yêu cầu tính nhẩm, mỗi questionText phải mở đầu bằng cụm `Tính nhẩm:` để thể hiện đúng kỹ năng.\n";
        }
        return instruction;
    }
}
