package com.aigameplatform.backend.service.generation.cpf;

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

/** Gọi Gemini (LangChain4j) sinh game CPF với Structured Outputs theo schema nới lỏng cho decoder. */
@Component
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
public class GeminiCpfContentGenerator implements CpfContentGenerator {

    static final String DECODER_SCHEMA = "/schema/cpf/2.0.0/cpf-game.ai-decoder.schema.json";

    private final ChatModel model;
    private final CpfPromptBuilder prompts;
    private final ResponseFormat responseFormat;

    public GeminiCpfContentGenerator(@Qualifier("gameGenerationChatModel") ChatModel model, CpfPromptBuilder prompts) {
        this.model = model;
        this.prompts = prompts;
        this.responseFormat = ResponseFormat.builder().type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder().rootElement(JsonRawSchema.builder().schema(loadSchema()).build()).build())
                .build();
    }

    private static String loadSchema() {
        try (InputStream in = GeminiCpfContentGenerator.class.getResourceAsStream(DECODER_SCHEMA)) {
            if (in == null) throw new IllegalStateException("Thiếu schema decoder CPF: " + DECODER_SCHEMA);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được schema decoder CPF: " + DECODER_SCHEMA, e);
        }
    }

    @Override
    public String generate(CpfGenerationAttempt attempt) {
        try {
            var response = model.chat(ChatRequest.builder()
                    .messages(SystemMessage.from(prompts.systemPrompt(attempt)), UserMessage.from(prompts.userPrompt(attempt)))
                    .parameters(ChatRequestParameters.builder().responseFormat(responseFormat).build())
                    .build());
            if (response == null || response.aiMessage() == null || response.aiMessage().text() == null) {
                throw new AiServiceUnavailableException("Gemini trả về rỗng");
            }
            return response.aiMessage().text();
        } catch (AiServiceUnavailableException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new AiServiceUnavailableException("Gọi Gemini sinh game CPF thất bại", e);
        }
    }
}
