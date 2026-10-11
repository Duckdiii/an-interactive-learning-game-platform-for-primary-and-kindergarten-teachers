package com.aigameplatform.backend.service.generation;

import dev.langchain4j.model.chat.Capability;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Creates the Gemini game-generation chat model only when its explicit feature flag is enabled. */
@Configuration
@ConditionalOnProperty(name = "app.ai.gemini.game-generation.enabled", havingValue = "true")
public class GeminiChatConfiguration {

    @Bean
    ChatModel gameGenerationChatModel(@Value("${app.ai.gemini.api-key:}") String apiKey,
                                      @Value("${app.ai.gemini.model:gemini-2.5-flash}") String modelName) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is required when Gemini game generation is enabled");
        }
        return GoogleAiGeminiChatModel.builder().apiKey(apiKey).modelName(modelName)
                .supportedCapabilities(Set.of(Capability.RESPONSE_FORMAT_JSON_SCHEMA))
                .maxRetries(0).build();
    }
}
