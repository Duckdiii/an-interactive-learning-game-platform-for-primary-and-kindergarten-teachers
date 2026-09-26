package com.aigameplatform.backend.service.strategy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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

    private String json(int count, int correctIndex, int optionCount) {
        String options = optionCount == 4 ? "[\"A\",\"B\",\"C\",\"D\"]" : "[\"A\",\"B\",\"C\"]";
        String question = "{\"text\":\"Câu hỏi?\",\"options\":" + options
                + ",\"correctIndex\":" + correctIndex + "}";
        return "{\"questions\":[" + String.join(",", java.util.Collections.nCopies(count, question)) + "]}";
    }
}
