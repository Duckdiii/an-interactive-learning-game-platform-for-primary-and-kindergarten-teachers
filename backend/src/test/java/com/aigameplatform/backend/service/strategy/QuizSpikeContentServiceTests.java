package com.aigameplatform.backend.service.strategy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.mockito.ArgumentCaptor;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class QuizSpikeContentServiceTests {

    private final QuizSpikeContentService service = new QuizSpikeContentService(null, new ObjectMapper());

    @Test
    void acceptsFourQuestionsWithFourStringOptionsAndZeroBasedAnswer() {
        var questions = service.parseSpikeResult(json(4, 3, 4));
        assertEquals(4, questions.size());
        assertEquals(3, questions.get(0).getCorrectIndex());
    }

    @Test
    void rejectsWrongQuestionCount() {
        assertThrows(IllegalArgumentException.class, () -> service.parseSpikeResult(json(3, 0, 4)));
    }

    @Test
    void rejectsOutOfRangeAnswerAndWrongOptionCount() {
        assertThrows(IllegalArgumentException.class, () -> service.parseSpikeResult(json(4, 4, 4)));
        assertThrows(IllegalArgumentException.class, () -> service.parseSpikeResult(json(4, 2, 3)));
    }

    @Test
    void rejectsMissingFieldsWrongTypesAndUnknownFields() {
        assertThrows(IllegalArgumentException.class,
                () -> service.parseSpikeResult(json(4, 0, 4).replace("\"correctIndex\":0", "\"answer\":0")));
        assertThrows(IllegalArgumentException.class,
                () -> service.parseSpikeResult(json(4, 0, 4).replace("\"correctIndex\":0", "\"correctIndex\":\"0\"")));
        assertThrows(IllegalArgumentException.class,
                () -> service.parseSpikeResult(json(4, 0, 4).replace("\"1\"", "42")));
        assertThrows(IllegalArgumentException.class,
                () -> service.parseSpikeResult(json(4, 0, 4).replace("\"text\":\"Câu hỏi?\"", "\"text\":\"Câu hỏi?\",\"id\":\"extra\"")));
    }

    @Test
    void rejectsDuplicateOrNonNumericCountingOptions() {
        assertThrows(IllegalArgumentException.class,
                () -> service.parseSpikeResult(json(4, 0, 4).replace("\"2\"", "\"1\"")));
        assertThrows(IllegalArgumentException.class,
                () -> service.parseSpikeResult(json(4, 0, 4).replace("\"4\"", "\"Mèo\"")));
    }

    @Test
    void newPromptTargetsTextOnlyCountingForAgesFiveToSix() {
        ChatModel model = mock(ChatModel.class);
        when(model.chat(anyString())).thenReturn("{\"questions\":[]}");
        var configuredService = new QuizSpikeContentService(model, new ObjectMapper());
        configuredService.generateRaw("đếm con vật", GradeLevel.KINDERGARTEN);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(model).chat(prompt.capture());
        assertTrue(prompt.getValue().contains("đếm số con vật trong phạm vi 5"));
        assertTrue(prompt.getValue().contains("trẻ 5–6 tuổi"));
        assertTrue(prompt.getValue().contains("Không dùng hình ảnh"));
        assertTrue(prompt.getValue().contains("đúng 4 câu"));
        assertTrue(prompt.getValue().contains("không hỏi số còn lại"));
        assertTrue(prompt.getValue().contains("nơi chốn và hành động phải nhất quán"));
        assertEquals("quiz-count-animals-v3", QuizSpikeContentService.PROMPT_VERSION);
    }

    @Test
    void structuredOutputRequiresAllDraftFields() {
        var format = QuizSpikeSchema.responseFormat();
        assertEquals(ResponseFormatType.JSON, format.type());
        var schema = (JsonRawSchema) format.jsonSchema().rootElement();
        var json = new ObjectMapper().readTree(schema.schema());
        assertEquals("object", json.path("type").asText());
        assertEquals("questions", json.path("required").get(0).asText());
        var questions = json.path("properties").path("questions");
        assertEquals(4, questions.path("minItems").asInt());
        assertEquals(4, questions.path("maxItems").asInt());
        var item = questions.path("items");
        assertEquals(3, item.path("required").size());
        assertTrue(item.path("required").toString().contains("text"));
        assertTrue(item.path("required").toString().contains("options"));
        assertTrue(item.path("required").toString().contains("correctIndex"));
        assertEquals(4, item.path("properties").path("options").path("minItems").asInt());
        assertEquals(4, item.path("properties").path("options").path("maxItems").asInt());
    }

    @Test
    void firstModelFailureIsPropagatedWithoutServiceRetry() {
        ChatModel model = mock(ChatModel.class);
        RuntimeException firstFailure = new RuntimeException("first call failed");
        when(model.chat(anyString())).thenThrow(firstFailure);
        var configuredService = new QuizSpikeContentService(model, new ObjectMapper());

        RuntimeException thrown = assertThrows(RuntimeException.class,
                () -> configuredService.generate("con vật", GradeLevel.KINDERGARTEN));
        assertSame(firstFailure, thrown);
        verify(model, times(1)).chat(anyString());
    }

    private String json(int count, int correctIndex, int optionCount) {
        String options = optionCount == 4 ? "[\"1\",\"2\",\"3\",\"4\"]" : "[\"1\",\"2\",\"3\"]";
        String question = "{\"text\":\"Câu hỏi?\",\"options\":" + options
                + ",\"correctIndex\":" + correctIndex + "}";
        return "{\"questions\":[" + String.join(",", java.util.Collections.nCopies(count, question)) + "]}";
    }
}
