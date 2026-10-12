package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Gemini structured-output adapter for every registered game strategy. */
@Component
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
public class GeminiGameContentGenerator implements GameContentGenerator {

    private static final Logger log = LoggerFactory.getLogger(GeminiGameContentGenerator.class);

    private final ChatModel model;
    private final GameContentStrategyRegistry strategies;

    public GeminiGameContentGenerator(ChatModel model, GameContentStrategyRegistry strategies) {
        this.model = model;
        this.strategies = strategies;
    }

    @Override
    public String generate(GenerationAttempt attempt) {
        GameContentStrategy<?, ?> strategy = strategies.get(attempt.gameType());
        String systemPrompt = strategy.buildPrompt(attempt.topic(), attempt.subject(), attempt.gradeLevel(),
                attempt.curriculumContext());
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
            GeminiProviderFailureDetails details = GeminiProviderFailureDetails.from(exception);
            log.error("Gemini generation failed: gameType={}, attempt={}, httpStatus={}, providerCode={}, "
                            + "providerMessage={}, correlationId={}", attempt.gameType(), attempt.attemptNumber(),
                    details.httpStatus(), details.providerCode(), details.providerMessage(), details.correlationId());
            throw new AiServiceUnavailableException("Gemini request failed", exception);
        }
    }

    private static String retryPrompt(GenerationAttempt attempt) {
        String errors = attempt.previousErrors().stream()
                .map(error -> error.path() + ": " + error.message()).collect(java.util.stream.Collectors.joining("\n"));
        return "Sửa JSON lần trước theo đúng schema. Không thay đổi căn cứ chương trình đã nêu trong system prompt.\n"
                + "Lỗi cần sửa:\n" + errors + "\nJSON trước:\n" + attempt.previousOutput()
                + "\nChỉ trả về JSON đã sửa.";
    }
}
