package com.aigameplatform.backend.service.generation.cpf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.admin.AiConfigVersionDto;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.admin.AiConfigService;
import com.aigameplatform.backend.service.generation.AiServiceUnavailableException;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.cpf.CpfAssetCatalog;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Gemini giả bằng ChatModel tự viết: kiểm request gửi đi (prompt, schema decoder), không gọi API thật. */
class GeminiCpfContentGeneratorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final CpfPromptBuilder PROMPTS = new CpfPromptBuilder(new CpfAssetCatalog(MAPPER));
    private static final CpfGenerationAttempt FIRST = new CpfGenerationAttempt(
            "Đua xe trả lời phép nhân bảng 2", Subject.MATH, GradeLevel.GRADE_2, 1, null, List.of());

    private final AiConfigService configs = mock(AiConfigService.class);

    @BeforeEach
    void configureActiveVersion() {
        when(configs.getActiveConfig()).thenReturn(new AiConfigVersionDto("active", "Chỉ dẫn Admin CPF", 0.45, 2400,
                0.85, null, false, true, "test-hash", Instant.EPOCH, "admin"));
    }

    private static ChatModel replying(AtomicReference<ChatRequest> sent, String text) {
        return new ChatModel() {
            @Override
            public ChatResponse doChat(ChatRequest request) {
                sent.set(request);
                return ChatResponse.builder().aiMessage(AiMessage.from(text)).build();
            }
        };
    }

    @Test
    void sendsSystemRulesAndTeacherIdeaSeparatelyWithTheDecoderSchema() {
        var sent = new AtomicReference<ChatRequest>();

        String result = new GeminiCpfContentGenerator(replying(sent, "{}"), PROMPTS, configs).generate(FIRST);

        assertThat(result).isEqualTo("{}");
        var messages = sent.get().messages();
        assertThat(messages.get(0)).isInstanceOf(SystemMessage.class);
        assertThat(sent.get().parameters().temperature()).isEqualTo(0.45);
        assertThat(sent.get().parameters().maxOutputTokens()).isEqualTo(2400);
        assertThat(((SystemMessage) messages.get(0)).text()).startsWith("Chỉ dẫn Admin CPF").contains("CPF Game v2.0.0", "fruit.apple", "GRADE_2",
                        "kể cả tên game và câu hỏi, viết bằng tiếng Việt")
                .doesNotContain(FIRST.idea());
        assertThat(((UserMessage) messages.get(1)).singleText()).contains(FIRST.idea());

        var raw = (JsonRawSchema) sent.get().parameters().responseFormat().jsonSchema().rootElement();
        JsonNode schema = MAPPER.readTree(raw.schema());
        assertThat(raw.schema()).doesNotContain("oneOf", "$ref", "minItems", "maxItems", "\"if\"");
        assertThat(schema.path("required").toString()).contains("answerKey", "entities", "rules");
    }

    @Test
    void retryPromptCarriesErrorsAndPreviousJson() {
        var sent = new AtomicReference<ChatRequest>();
        var retry = new CpfGenerationAttempt(FIRST.idea(), FIRST.subject(), FIRST.gradeLevel(), 2, "{\"kind\":\"CPF\"}",
                List.of(new ValidationError("$.entities[0].assetId", "không có trong danh mục")));

        new GeminiCpfContentGenerator(replying(sent, "{}"), PROMPTS, configs).generate(retry);

        assertThat(((UserMessage) sent.get().messages().get(1)).singleText())
                .contains("$.entities[0].assetId", "không có trong danh mục", "{\"kind\":\"CPF\"}");
    }

    @Test
    void emptyOrFailedCallsBecomeServiceUnavailable() {
        ChatModel failing = new ChatModel() {
            @Override
            public ChatResponse doChat(ChatRequest request) {
                throw new IllegalStateException("quota");
            }
        };
        ChatModel empty = new ChatModel() {
            @Override
            public ChatResponse doChat(ChatRequest request) {
                return ChatResponse.builder().aiMessage(AiMessage.from((String) null)).build();
            }
        };

        assertThatThrownBy(() -> new GeminiCpfContentGenerator(failing, PROMPTS, configs).generate(FIRST))
                .isInstanceOf(AiServiceUnavailableException.class);
        assertThatThrownBy(() -> new GeminiCpfContentGenerator(empty, PROMPTS, configs).generate(FIRST))
                .isInstanceOf(AiServiceUnavailableException.class);
    }
}
