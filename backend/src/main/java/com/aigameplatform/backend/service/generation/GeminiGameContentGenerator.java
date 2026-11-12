package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.service.asset.AssetRetriever;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Gemini adapter that delegates content instructions and schema to the selected game strategy. */
@Component
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
public class GeminiGameContentGenerator implements GameContentGenerator {

    private static final tools.jackson.databind.json.JsonMapper SCHEMA_MAPPER = new tools.jackson.databind.json.JsonMapper();

    private static final String VERIFIED_ARITHMETIC_FORMAT = """
            ĐỊNH DẠNG KIỂM CHỨNG CHO PHÉP CỘNG/TRỪ CỦA PILOT:
            Giữ nguyên kỹ năng và phạm vi trong yêu cầu của giáo viên. Mỗi questionText phải ghi đúng một phép tính
            bằng chữ số và ký hiệu + hoặc -, ví dụ `2 + 3 = ?` hoặc `5 - 2 = ?`; không viết phép tính bằng chữ
            (như “2 cộng 3”) và không chuyển thành bài toán kể chuyện. Mỗi options.text chỉ là một số nguyên dạng chữ số,
            và correctIndex phải trỏ tới đúng kết quả duy nhất. Đây chỉ là cách trình bày cùng phép tính được yêu cầu,
            không được đổi chủ đề, kỹ năng, giới hạn số hoặc thêm phép tính.
            """;

    private static final int SHORTLIST_SIZE = 12;

    private static final String ASSET_RULES = """
            HÌNH MINH HỌA (trường asset): ở mỗi chỗ có visualPrompt, đặt asset là id trong DANH MỤC HÌNH dưới đây khi có
            hình đúng NGHĨA của chữ trong ngữ cảnh (ví dụ "bóng bay" là fluent-object-balloon, không phải quả bóng đá).
            Không có hình đúng nghĩa thì BỎ HẲN trường asset (không để chuỗi rỗng); TUYỆT ĐỐI không chọn hình khác nghĩa chỉ để có hình
            (ví dụ "bàn" không phải quyển sách, "khăn" không phải cái ô, từ vô nghĩa không có hình). Chỉ dùng đúng id có trong danh mục.
            Câu đếm số lượng ("3 con vịt"): asset là hình VẬT được đếm (con vịt), KHÔNG chọn hình thẻ số vì thẻ số lộ đáp án và
            không có gì để đếm.
            Mô tả hình (visualPrompt) của câu đếm viết bằng chữ số, ví dụ "3 con vịt" (không viết "ba con vịt"), và số đó phải
            bằng đáp án đúng.
            DANH MỤC HÌNH (id: tên):
            """;

    private final ChatModel model;
    private final GameContentStrategyRegistry strategies;
    private final GameAssetCatalog assets;
    private final CurriculumTopicParser topicParser = new CurriculumTopicParser();
    private final AssetRetriever retriever;
    private final boolean shortlistEnabled;

    public GeminiGameContentGenerator(@Qualifier("gameGenerationChatModel") ChatModel model,
            GameContentStrategyRegistry strategies, GameAssetCatalog assets, AssetRetriever retriever,
            @Value("${app.assets.shortlist.enabled:false}") boolean shortlistEnabled) {
        this.model = model;
        this.strategies = strategies;
        this.assets = assets;
        this.retriever = retriever;
        this.shortlistEnabled = shortlistEnabled;
    }

    /** Hình có từ khóa trong yêu cầu của giáo viên, đưa lên đầu danh mục để AI chọn đúng hình (thử nghiệm, sau cờ). */
    private String shortlist(String topic) {
        if (!shortlistEnabled) return "";
        String lines = retriever.match(topic).stream().limit(SHORTLIST_SIZE).map(match -> assets.find(match.assetId()))
                .filter(Objects::nonNull).map(entry -> entry.id() + ": " + entry.label()).collect(Collectors.joining("\n"));
        return lines.isEmpty() ? "" : "HÌNH LIÊN QUAN TỚI YÊU CẦU (ưu tiên chọn nếu đúng nghĩa):\n" + lines + "\n\n";
    }

    @Override
    public String generate(GenerationAttempt attempt) {
        GameContentStrategy<?, ?> strategy = strategies.get(attempt.gameType());
        String systemPrompt = strategy.buildPrompt(attempt.topic(), attempt.subject(), attempt.gradeLevel(),
                attempt.curriculumContext());
        // Chỉ loại game có trường asset trong schema đầu ra mới cần danh mục (tránh prompt dài vô ích).
        if (strategy.hasAssetField()) {
            systemPrompt += "\n\n" + ASSET_RULES + shortlist(attempt.topic()) + assets.promptList();
        }
        String arithmeticInstruction = explicitArithmeticInstruction(attempt);
        if (arithmeticInstruction != null) systemPrompt += "\n\n" + arithmeticInstruction;
        Revision revision = attempt.revision();
        String userPrompt = attempt.isRetry()
                ? retryPrompt(attempt) + (revision == null ? "" : "\n" + revision.reminder())
                : revision != null
                        ? revision.promptSection() + "\nChỉ trả về JSON theo schema đã cung cấp."
                        : "Tạo nội dung game theo yêu cầu trong system prompt. Chỉ trả về JSON theo schema đã cung cấp.";
        ResponseFormat schemaFormat = ResponseFormat.builder().type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder().rootElement(JsonRawSchema.builder()
                        .schema(decoderSchema(attempt.structuredSchema())).build()).build()).build();
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

    /** Array counters in nested schemas can exhaust Gemini's constrained decoder state space.
     * Keep the structural JSON contract and describe the counts; AiOutputValidator still enforces
     * the complete, unchanged resource schema before any factory, business or grounding review. */
    private static String decoderSchema(String fullSchema) {
        var schema = SCHEMA_MAPPER.readTree(fullSchema);
        describeArrayCounts(schema);
        return SCHEMA_MAPPER.writeValueAsString(schema);
    }

    private static void describeArrayCounts(tools.jackson.databind.JsonNode node) {
        if (node instanceof tools.jackson.databind.node.ObjectNode object
                && "array".equals(object.path("type").asString(""))
                && (object.has("minItems") || object.has("maxItems"))) {
            String limits = "Array length: "
                    + (object.has("minItems") ? "minimum " + object.path("minItems").asInt() + "; " : "")
                    + (object.has("maxItems") ? "maximum " + object.path("maxItems").asInt() + "; " : "")
                    + "these limits are mandatory and validated by the application.";
            String previous = object.path("description").asString("");
            object.put("description", previous.isBlank() ? limits : previous + " " + limits);
            object.remove("minItems");
            object.remove("maxItems");
        }
        if (node.isObject() || node.isArray()) node.forEach(GeminiGameContentGenerator::describeArrayCounts);
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
        if (!parsed.supportsPilotArithmetic()) return null;
        String instruction = VERIFIED_ARITHMETIC_FORMAT;
        if (parsed.requirements().stream().anyMatch(CurriculumTopicParser.Requirement::mental)) {
            instruction += " Với yêu cầu tính nhẩm, mỗi questionText phải mở đầu bằng cụm `Tính nhẩm:` để thể hiện đúng kỹ năng.\n";
        }
        return instruction;
    }
}
