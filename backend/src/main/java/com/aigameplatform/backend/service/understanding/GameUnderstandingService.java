package com.aigameplatform.backend.service.understanding;

import com.aigameplatform.backend.dto.request.UnderstandGameRequest;
import com.aigameplatform.backend.dto.response.GameUnderstandingResponse;
import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.dto.understanding.GameUnderstanding;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.generation.AiServiceUnavailableException;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Bước phân tích yêu cầu trước khi sinh game ({@code POST /games/understand}). Không lưu gì; chỉ gọi AI rồi chuẩn hóa kết
 * quả về đúng giới hạn của contract (độ dài, số mục, câu hỏi lại tối đa {@value #MAX_QUESTIONS} lần).
 */
@Slf4j
@Service
public class GameUnderstandingService {

    static final int MAX_QUESTIONS = 2;
    // Structured Outputs hiếm khi trả JSON hỏng; thử thêm một lần rồi báo lỗi để giáo viên gửi lại.
    private static final int ATTEMPTS = 2;
    private static final String DEFAULT_REPLY = "Em đã cập nhật thẻ bên cạnh, thầy/cô xem lại giúp em nhé.";

    private final ObjectProvider<GameUnderstandingGenerator> generatorProvider;
    private final UnderstandingPromptBuilder prompts;
    private final JsonMapper jsonMapper;

    public GameUnderstandingService(ObjectProvider<GameUnderstandingGenerator> generatorProvider,
            UnderstandingPromptBuilder prompts, JsonMapper jsonMapper) {
        this.generatorProvider = generatorProvider;
        this.prompts = prompts;
        this.jsonMapper = jsonMapper;
    }

    public GameUnderstandingResponse understand(UnderstandGameRequest request) {
        List<ChatTurn> messages = request.messages();
        if (messages.getLast().role() != ChatTurn.Role.TEACHER) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tin nhắn cuối phải là của giáo viên");
        }
        GameUnderstandingGenerator generator = generatorProvider.getIfAvailable();
        if (generator == null) throw new AiGenerationTimeoutException("Chưa cấu hình dịch vụ AI");

        // Mỗi lượt trợ lý trước đó tính là một lần đã hỏi (hoặc đã chốt): đủ chặn hỏi vòng vo mà không cần lưu trạng thái.
        long asked = messages.stream().filter(turn -> turn.role() == ChatTurn.Role.ASSISTANT).count();
        int questionsLeft = (int) Math.max(0, MAX_QUESTIONS - asked);
        String system = prompts.systemPrompt();
        String user = prompts.userPrompt(request, questionsLeft);

        for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
            AiOutput output = parse(call(generator, system, user));
            if (output != null) return normalize(output, questionsLeft > 0);
            log.info("Lần thử {} phân tích yêu cầu trả JSON không đọc được", attempt);
        }
        throw new AiGenerationTimeoutException("AI chưa phân tích được yêu cầu, vui lòng thử lại");
    }

    private static String call(GameUnderstandingGenerator generator, String system, String user) {
        try {
            return generator.generate(system, user);
        } catch (AiServiceUnavailableException e) {
            Throwable cause = e.getCause() == null ? e : e.getCause();
            log.error("Không gọi được dịch vụ AI khi phân tích yêu cầu ({})", cause.getClass().getSimpleName());
            throw new AiGenerationTimeoutException("Dịch vụ AI không phản hồi, vui lòng thử lại sau", e);
        }
    }

    private AiOutput parse(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            AiOutput output = jsonMapper.readValue(raw, AiOutput.class);
            return output == null || output.understanding() == null ? null : output;
        } catch (JacksonException e) {
            return null;
        }
    }

    static GameUnderstandingResponse normalize(AiOutput output, boolean mayAsk) {
        GameUnderstanding card = output.understanding();
        GameType gameType = card.gameType() == null ? GameType.QUIZ : card.gameType();
        List<GameType> alternatives = nonNull(card.alternativeGameTypes()).stream()
                .filter(Objects::nonNull).filter(type -> type != gameType).distinct().limit(2).toList();
        List<GameUnderstanding.UnsupportedNeed> unsupported = nonNull(card.unsupported()).stream()
                .filter(Objects::nonNull)
                .filter(item -> !blank(item.need()) && !blank(item.fallback()))
                .limit(5)
                .map(item -> new GameUnderstanding.UnsupportedNeed(cut(item.need(), 200), cut(item.fallback(), 200)))
                .toList();
        GameUnderstanding normalized = new GameUnderstanding(cut(card.learningGoal(), 200), cut(card.childAction(), 200),
                texts(card.content(), 20, 100), cut(card.setting(), 200), gameType, alternatives, unsupported,
                texts(card.assumptions(), 5, 200));

        GameUnderstandingResponse.Question question = null;
        if (mayAsk && output.question() != null && !blank(output.question().text())) {
            question = new GameUnderstandingResponse.Question(cut(output.question().text(), 300),
                    texts(output.question().quickReplies(), 4, 60));
        }
        String reply = blank(output.reply()) ? DEFAULT_REPLY : cut(output.reply(), 600);
        return new GameUnderstandingResponse(reply, question, normalized, question == null);
    }

    private static <T> List<T> nonNull(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static List<String> texts(List<String> list, int maxItems, int maxLength) {
        return nonNull(list).stream().filter(text -> !blank(text)).limit(maxItems).map(text -> cut(text, maxLength)).toList();
    }

    private static boolean blank(String text) {
        return text == null || text.isBlank();
    }

    private static String cut(String text, int max) {
        if (text == null) return "";
        String trimmed = text.strip();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    /** Dạng JSON AI trả về (schema/game-understanding/1.0.0); khác response ở chỗ chưa có {@code ready}. */
    record AiOutput(String reply, GameUnderstandingResponse.Question question, GameUnderstanding understanding) {
    }
}
