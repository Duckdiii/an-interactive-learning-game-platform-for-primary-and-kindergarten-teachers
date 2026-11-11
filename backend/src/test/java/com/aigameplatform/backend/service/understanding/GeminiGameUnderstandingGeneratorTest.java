package com.aigameplatform.backend.service.understanding;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GameType;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GeminiGameUnderstandingGeneratorTest {

    @Test
    void sendsSystemAndUserPromptsSeparatelyWithTheOutputSchema() {
        var sent = new AtomicReference<ChatRequest>();
        ChatModel model = new ChatModel() {
            @Override
            public ChatResponse doChat(ChatRequest request) {
                sent.set(request);
                return ChatResponse.builder().aiMessage(AiMessage.from("{}")).build();
            }
        };

        assertThat(new GeminiGameUnderstandingGenerator(model).generate("luật", "giáo viên")).isEqualTo("{}");
        assertThat(((SystemMessage) sent.get().messages().get(0)).text()).isEqualTo("luật");
        assertThat(((UserMessage) sent.get().messages().get(1)).singleText()).isEqualTo("giáo viên");
        var raw = (JsonRawSchema) sent.get().parameters().responseFormat().jsonSchema().rootElement();
        assertThat(raw.schema()).doesNotContain("oneOf", "$ref");
    }

    @Test
    void theSchemaOffersExactlyTheGameTypesTheBackendKnows() {
        JsonNode schema = JsonMapper.builder().build().readTree(GeminiGameUnderstandingGenerator.loadSchema());
        JsonNode card = schema.path("properties").path("understanding").path("properties");

        var expected = Arrays.stream(GameType.values()).map(Enum::name).toList();
        assertThat(card.path("gameType").path("enum").valueStream().map(JsonNode::asString).toList())
                .containsExactlyInAnyOrderElementsOf(expected);
        assertThat(card.path("alternativeGameTypes").path("items").path("enum").valueStream().map(JsonNode::asString).toList())
                .containsExactlyInAnyOrderElementsOf(expected);
    }
}
