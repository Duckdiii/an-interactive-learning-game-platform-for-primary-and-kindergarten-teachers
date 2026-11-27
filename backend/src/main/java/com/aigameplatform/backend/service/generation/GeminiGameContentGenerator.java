package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.admin.AiConfigVersionDto;
import com.aigameplatform.backend.service.asset.AssetRetriever;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.admin.AiConfigService;
import com.aigameplatform.backend.service.curriculum.CurriculumConstraints;
import com.aigameplatform.backend.service.curriculum.CurriculumTopicParser;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Autowired;
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

    private static final String STUDENT_TEXT_PUNCTUATION_GUIDANCE = """
            QUY TẮC DẤU CÂU CHO CÂU HỎI VÀ GIỌNG ĐỌC:
            Với các trường text, questionText, sentenceTemplate và audioText, nếu nội dung là câu hỏi, câu hướng dẫn,
            hoặc câu nói hoàn chỉnh thì phải đặt dấu kết thúc phù hợp với ngữ điệu: dấu hỏi (?) cho câu hỏi, dấu chấm (.)
            cho câu kể/hướng dẫn, hoặc dấu chấm than (!) khi nội dung thực sự cần nhấn mạnh. Ví dụ: "Hãy lật thẻ để tìm
            các cặp phép tính và kết quả đúng trong phạm vi 100." Giữ dấu câu ở cuối câu, kể cả câu có chỗ trống.
            Không thêm dấu câu vào từ vựng đứng riêng, nhãn, phương án trả lời, tên thẻ, hoặc biểu thức toán học chỉ để
            làm đẹp. Không đổi nội dung, đáp án, cấu trúc DSL hay luật chơi; chỉ trình bày dấu câu phù hợp.
            """;

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
    private final ChatModel regenerationModel;
    private final GameContentStrategyRegistry strategies;
    private final AiConfigService aiConfigService;
    private final GameAssetCatalog assets;
    private final CurriculumTopicParser topicParser = new CurriculumTopicParser();
    private final AssetRetriever retriever;
    private final boolean shortlistEnabled;
    private final com.aigameplatform.backend.service.media.NotoEmojiCatalog notoCatalog;

    public GeminiGameContentGenerator(@Qualifier("gameGenerationChatModel") ChatModel model,
            GameContentStrategyRegistry strategies, GameAssetCatalog assets, AssetRetriever retriever,
            boolean shortlistEnabled, com.aigameplatform.backend.service.media.NotoEmojiCatalog notoCatalog) {
        this(model, model, strategies, assets, retriever, shortlistEnabled, notoCatalog, null);
    }

    @Autowired
    public GeminiGameContentGenerator(@Qualifier("gameGenerationChatModel") ChatModel model,
            @Qualifier("questionRegenerationChatModel") ChatModel regenerationModel, GameContentStrategyRegistry strategies, GameAssetCatalog assets, AssetRetriever retriever,
            @Value("${app.assets.shortlist.enabled:false}") boolean shortlistEnabled,
            com.aigameplatform.backend.service.media.NotoEmojiCatalog notoCatalog,
            @Autowired(required = false) AiConfigService aiConfigService) {
        this.notoCatalog = notoCatalog;
        this.model = model;
        this.regenerationModel = regenerationModel;
        this.strategies = strategies;
        this.assets = assets;
        this.retriever = retriever;
        this.shortlistEnabled = shortlistEnabled;
        this.aiConfigService = aiConfigService;
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
        String systemPrompt;
        if (attempt.imageInput() != null) {
            if (!(strategy instanceof com.aigameplatform.backend.service.strategy.VisualClozeGameStrategy visualCloze)) {
                throw new AiServiceUnavailableException("Image input is supported only for Visual Cloze");
            }
            var scene = attempt.imageInput().sceneImage();
            systemPrompt = visualCloze.buildImagePrompt(attempt.topic(), attempt.subject(), attempt.gradeLevel(),
                    attempt.curriculumContext(), scene.width(), scene.height(), attempt.imageInput().optionImages()
                            .stream().map(asset -> new com.aigameplatform.backend.dto.request.GenerateGameRequest.OptionImage(
                                    asset.imageUrl(), asset.visualPrompt())).toList());
        } else {
            systemPrompt = strategy.buildPrompt(attempt.topic(), attempt.subject(), attempt.gradeLevel(),
                    attempt.curriculumContext());
        }
        if (attempt.oddImageMode()) {
            String catalog = notoCatalog.assets().stream()
                    .map(asset -> asset.id() + " | " + asset.label() + " | " + asset.group())
                    .collect(java.util.stream.Collectors.joining("\n"));
            systemPrompt += "\n\n" + """
                    ODD_ONE_OUT IMAGE MODE: items phải là 4 đến 6 mã asset khác nhau từ catalog dưới đây,
                    không phải nhãn hay URL. Chọn các hình cùng group, trừ đúng một hình thuộc group khác;
                    oddOneOutIndex trỏ vào hình khác. questionText nêu rõ tiêu chí phân loại để trẻ nhận ra.
                    Nếu catalog không hỗ trợ yêu cầu thì không thay chủ đề hoặc tự bịa asset.
                    CATALOG (mã | nhãn đã biên tập | nhóm):
                    """ + catalog;
        }
        if (attempt.avmCatalogMode()) {
            String catalog = notoCatalog.assets().stream()
                    .map(asset -> asset.id() + " | " + asset.label() + " | " + asset.group())
                    .collect(java.util.stream.Collectors.joining("\n"));
            systemPrompt += "\n\n" + """
                    AVM CATALOG MODE: correct.visualPrompt và từng distractor.visualPrompt phải là các mã asset
                    khác nhau lấy nguyên văn từ catalog, không phải nhãn hay URL. audioText là nội dung trẻ sẽ nghe;
                    chọn đúng một ảnh khớp audioText và các ảnh sai phân biệt được. Giữ đúng môn, lớp và chủ đề.
                    Nếu catalog không hỗ trợ chủ đề, không bịa mã hoặc tự đổi chủ đề.
                    CATALOG (mã | nhãn đã biên tập | nhóm):
                    """ + catalog;
        }
        // Chỉ loại game có trường asset trong schema đầu ra mới cần danh mục (tránh prompt dài vô ích); các chế độ hình
        // ảnh có danh mục/ảnh riêng nên không thêm, tránh hai chỉ dẫn chọn hình mâu thuẫn nhau.
        boolean imageMode = attempt.imageInput() != null || attempt.oddImageMode() || attempt.avmCatalogMode();
        if (strategy.hasAssetField() && !imageMode) {
            systemPrompt += "\n\n" + ASSET_RULES + shortlist(attempt.topic()) + assets.promptList();
        }
        String arithmeticInstruction = explicitArithmeticInstruction(attempt);
        if (arithmeticInstruction != null) systemPrompt += "\n\n" + arithmeticInstruction;
        systemPrompt += "\n\n" + STUDENT_TEXT_PUNCTUATION_GUIDANCE;
        boolean singleQuestion = attempt.singleQuestion();
        if (attempt.customInstruction() != null && !attempt.customInstruction().isBlank()) {
            systemPrompt += "\n\n" + attempt.customInstruction();
        }
        Revision revision = attempt.revision();
        String userPrompt = attempt.previousOutput() != null
                ? retryPrompt(attempt) + (revision == null ? "" : "\n" + revision.reminder())
                : revision != null
                        ? revision.promptSection() + "\nChỉ trả về JSON theo schema đã cung cấp."
                        : singleQuestion
                                ? "Tạo đúng 1 câu hỏi mới theo yêu cầu và hướng dẫn trong system prompt. Chỉ trả về JSON theo schema đã cung cấp (mảng questions chứa đúng 1 phần tử)."
                                : "Tạo nội dung game theo yêu cầu trong system prompt. Chỉ trả về JSON theo schema đã cung cấp.";
        ResponseFormat schemaFormat = ResponseFormat.builder().type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder().rootElement(JsonRawSchema.builder()
                        .schema(decoderSchema(attempt.structuredSchema())).build()).build()).build();
        var paramBuilder = ChatRequestParameters.builder().responseFormat(schemaFormat);
        if (aiConfigService != null) {
            AiConfigVersionDto activeConfig = aiConfigService.getActiveConfig();
            if (activeConfig != null) {
                systemPrompt = activeConfig.systemPrompt() + "\n\n" + systemPrompt;
                if (activeConfig.temperature() != null) {
                    paramBuilder.temperature(activeConfig.temperature());
                }
                if (activeConfig.maxTokens() != null) {
                    paramBuilder.maxOutputTokens(activeConfig.maxTokens());
                }
            }
        }
        ChatRequestParameters parameters = paramBuilder.build();
        try {
            UserMessage userMessage = attempt.imageInput() == null ? UserMessage.from(userPrompt)
                    : UserMessage.from(userPrompt, ImageContent.from(
                            Base64.getEncoder().encodeToString(attempt.imageInput().sceneImage().bytes()),
                            attempt.imageInput().sceneImage().mediaType()));
            var response = (singleQuestion ? regenerationModel : model).chat(ChatRequest.builder()
                    .messages(SystemMessage.from(systemPrompt), userMessage)
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
