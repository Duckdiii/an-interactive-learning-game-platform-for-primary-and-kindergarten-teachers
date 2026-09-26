package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.response.QuizAiContentDraft;
import com.aigameplatform.backend.dto.response.QuizAiQuestionDraft;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import dev.langchain4j.model.chat.ChatModel;
import java.util.List;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

@RequiredArgsConstructor
public class QuizSpikeContentService {

    private final ChatModel model;
    private final ObjectMapper objectMapper;

    public List<QuizAiQuestionDraft> generate(String topic, GradeLevel grade) {
        if (topic == null || topic.isBlank() || grade == null) {
            throw new IllegalArgumentException("Topic and grade are required");
        }

        String prompt = """
                Create exactly 4 age-appropriate QUIZ questions for topic: %s; grade: %s.
                Return only one JSON object with a questions array. Each question must contain only:
                text (non-blank string), options (exactly 4 non-blank strings),
                correctIndex (integer from 0 to 3, zero-based index of the correct option).
                Do not include game IDs, itemIndex, timeLimit, point, shareCode, version or status.
                """.formatted(topic, grade);

        return parseSpikeResult(model.chat(prompt));
    }

    public List<QuizAiQuestionDraft> parseSpikeResult(String rawJson) {
        try {
            QuizAiContentDraft content = objectMapper.readValue(rawJson, QuizAiContentDraft.class);
            if (content == null || content.getQuestions() == null || content.getQuestions().size() != 4) {
                throw new IllegalArgumentException("Spike requires exactly 4 questions");
            }
            for (int i = 0; i < content.getQuestions().size(); i++) {
                QuizAiQuestionDraft question = content.getQuestions().get(i);
                if (question == null || question.getText() == null || question.getText().isBlank()) {
                    throw new IllegalArgumentException("Question " + i + " needs non-blank text");
                }
                if (question.getOptions() == null || question.getOptions().size() != 4
                        || question.getOptions().stream().anyMatch(option -> option == null || option.isBlank())) {
                    throw new IllegalArgumentException("Question " + i + " needs 4 non-blank options");
                }
                if (question.getCorrectIndex() == null || question.getCorrectIndex() < 0
                        || question.getCorrectIndex() > 3) {
                    throw new IllegalArgumentException("Question " + i + " needs correctIndex from 0 to 3");
                }
            }
            return List.copyOf(content.getQuestions());
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Gemini returned invalid QUIZ JSON", exception);
        }
    }
}
