package com.aigameplatform.backend.service.understanding;

import com.aigameplatform.backend.service.generation.AiServiceUnavailableException;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Gọi Gemini (LangChain4j) với Structured Outputs theo schema đầu ra của bước phân tích yêu cầu. */
@Component
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
public class GeminiGameUnderstandingGenerator implements GameUnderstandingGenerator {

    static final String OUTPUT_SCHEMA = "/schema/game-understanding/1.0.0/understanding.ai-output.schema.json";

    private final ChatModel model;
    private final ResponseFormat responseFormat;

    public GeminiGameUnderstandingGenerator(@Qualifier("gameGenerationChatModel") ChatModel model) {
        this.model = model;
        this.responseFormat = ResponseFormat.builder().type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder().rootElement(JsonRawSchema.builder().schema(loadSchema()).build()).build())
                .build();
    }

    static String loadSchema() {
        try (InputStream in = GeminiGameUnderstandingGenerator.class.getResourceAsStream(OUTPUT_SCHEMA)) {
            if (in == null) throw new IllegalStateException("Thiếu schema đầu ra phân tích yêu cầu: " + OUTPUT_SCHEMA);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được schema: " + OUTPUT_SCHEMA, e);
        }
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        try {
            var response = model.chat(ChatRequest.builder()
                    .messages(SystemMessage.from(systemPrompt), UserMessage.from(userPrompt))
                    .parameters(ChatRequestParameters.builder().responseFormat(responseFormat).build())
                    .build());
            if (response == null || response.aiMessage() == null || response.aiMessage().text() == null) {
                throw new AiServiceUnavailableException("Gemini trả về rỗng");
            }
            return response.aiMessage().text();
        } catch (AiServiceUnavailableException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new AiServiceUnavailableException("Gọi Gemini phân tích yêu cầu thất bại", e);
        }
    }
}
