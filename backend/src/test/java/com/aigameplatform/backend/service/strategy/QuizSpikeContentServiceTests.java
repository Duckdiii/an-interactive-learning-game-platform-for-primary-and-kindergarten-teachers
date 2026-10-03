package com.aigameplatform.backend.service.strategy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

class QuizSpikeContentServiceTests {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final QuizSpikeContentService parser = new QuizSpikeContentService(mock(ChatModel.class), objectMapper);

    /** Verifies contract parsing preserves optional fields. */
    @Test
    void parsesContractOutputAndAllowsOptionalFields() {
        String json = json(4, 3, 4).replace("\"correctIndex\":3", "\"correctIndex\":3,\"audioText\":\"Nghe câu hỏi\"");
        var questions = parser.parseSpikeResult(json);
        assertEquals(4, questions.size());
        assertEquals("1", questions.getFirst().options().getFirst());
        assertEquals("Nghe câu hỏi", questions.getFirst().audioText());
    }

    /** Verifies malformed structure and invalid spike criteria use distinct exceptions. */
    @Test
    void rejectsStructuralAndSpikeCriteriaErrorsSeparately() {
        assertThrows(QuizSpikeCriteriaException.class, () -> parser.parseSpikeResult(json(3, 0, 4)));
        assertThrows(QuizSpikeCriteriaException.class, () -> parser.parseSpikeResult(json(4, 4, 4)));
        assertThrows(QuizSpikeCriteriaException.class, () -> parser.parseSpikeResult(json(4, 0, 3)));
        assertThrows(QuizSpikeStructureException.class,
                () -> parser.parseSpikeResult(json(4, 0, 4).replace("\"correctIndex\":0", "\"answer\":0")));
        assertThrows(QuizSpikeStructureException.class,
                () -> parser.parseSpikeResult(json(4, 0, 4).replace("\"correctIndex\":0", "\"correctIndex\":\"0\"")));
        assertThrows(QuizSpikeStructureException.class,
                () -> parser.parseSpikeResult(json(4, 0, 4).replace("\"text\":\"Câu hỏi?\"", "\"text\":\"Câu hỏi?\",\"id\":\"extra\"")));
        assertThrows(QuizSpikeStructureException.class, () -> parser.parseSpikeResult("{not-json"));
    }

    /** Verifies choices must be distinct counting numbers and optional text cannot be blank. */
    @Test
    void rejectsDuplicateAndNonCountingOptions() {
        assertThrows(QuizSpikeCriteriaException.class,
                () -> parser.parseSpikeResult(json(4, 0, 4).replace("\"2\"", "\"1\"")));
        assertThrows(QuizSpikeCriteriaException.class,
                () -> parser.parseSpikeResult(json(4, 0, 4).replace("\"4\"", "\"Mèo\"")));
        assertThrows(QuizSpikeStructureException.class,
                () -> parser.parseSpikeResult(json(4, 0, 4).replace("\"correctIndex\":0", "\"correctIndex\":0,\"audioText\":\"\"")));
    }

    /** Verifies the AI Service request carries the derived schema and returns raw response text. */
    @Test
    void aiServicesRequestContainsDerivedNativeJsonSchemaAndReturnsRawResponse() {
        ChatModel model = mock(ChatModel.class);
        String raw = json(4, 3, 4);
        when(model.chat(any(ChatRequest.class))).thenReturn(ChatResponse.builder().aiMessage(AiMessage.from(raw)).build());
        var service = new QuizSpikeContentService(model, objectMapper);

        var result = service.generate("đếm con vật", GradeLevel.KINDERGARTEN);

        assertEquals(raw, result.rawOutput());
        assertEquals(4, result.output().questions().size());
        ArgumentCaptor<ChatRequest> request = ArgumentCaptor.forClass(ChatRequest.class);
        verify(model).chat(request.capture());
        var format = request.getValue().parameters().responseFormat();
        var schema = objectMapper.readTree(((dev.langchain4j.model.chat.request.json.JsonRawSchema)
                format.jsonSchema().rootElement()).schema());
        assertEquals(4, schema.path("properties").path("questions").path("minItems").asInt());
        assertEquals(4, schema.path("properties").path("questions").path("maxItems").asInt());
        assertEquals(4, schema.path("properties").path("questions").path("items")
                .path("properties").path("options").path("minItems").asInt());
        assertTrue(schema.path("properties").path("questions").path("items").path("properties")
                .has("visualPrompt"));
        assertTrue(schema.path("properties").path("questions").path("items").path("required")
                .toString().contains("correctIndex"));
        assertEquals(3, schema.path("properties").path("questions").path("items").path("required").size());
    }

    /** Verifies unsupported grades fail before the model call and model failures are not retried. */
    @Test
    void unsupportedGradeIsRejectedBeforeModelCallAndAiServiceDoesNotRetry() {
        ChatModel model = mock(ChatModel.class);
        var service = new QuizSpikeContentService(model, objectMapper);
        var invalidGrade = assertThrows(IllegalArgumentException.class,
                () -> service.generate("topic", GradeLevel.GRADE_5));
        assertTrue(invalidGrade.getMessage().contains("KINDERGARTEN"));
        verify(model, never()).chat(any(ChatRequest.class));

        when(model.chat(any(ChatRequest.class))).thenThrow(new RuntimeException("first call failed"));
        assertThrows(RuntimeException.class, () -> service.generate("topic", GradeLevel.KINDERGARTEN));
        verify(model).chat(any(ChatRequest.class));
    }

    /** Verifies the spike schema is derived deterministically and retains optional contract fields. */
    @Test
    void spikeSchemaIsDerivedFromProductionSchemaAndHashIsStable() {
        var first = QuizSpikeSchema.definition();
        var second = QuizSpikeSchema.definition();
        assertEquals(first, second);
        assertTrue(first.rawSchema().contains("visualPrompt"));
        assertTrue(first.rawSchema().contains("audioText"));
        assertTrue(first.sha256().matches("[0-9a-f]{64}"));
        assertTrue(List.of(GradeLevel.values()).contains(GradeLevel.KINDERGARTEN));
    }

    /** Builds a compact quiz response fixture with the requested counts and answer index. */
    private String json(int count, int correctIndex, int optionCount) {
        String options = optionCount == 4 ? "[\"1\",\"2\",\"3\",\"4\"]" : "[\"1\",\"2\",\"3\"]";
        String question = "{\"text\":\"Câu hỏi?\",\"options\":" + options
                + ",\"correctIndex\":" + correctIndex + "}";
        return "{\"questions\":[" + String.join(",", java.util.Collections.nCopies(count, question)) + "]}";
    }
}
