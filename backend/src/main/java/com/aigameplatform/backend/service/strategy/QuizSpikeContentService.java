package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiQuestion;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.Result;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

@RequiredArgsConstructor
public class QuizSpikeContentService {

    public static final String PROMPT_VERSION = "quiz-count-animals-v4";

    private final QuizSpikeAiService aiService;
    private final ObjectMapper objectMapper;

    public QuizSpikeContentService(ChatModel model, ObjectMapper objectMapper) {
        this(AiServices.builder(QuizSpikeAiService.class).chatModel(model).build(), objectMapper);
    }

    public QuizSpikeResult generate(String topic, GradeLevel grade) {
        validateRequest(topic, grade);
        Result<QuizAiOutput> result = aiService.generate(topic, QuizSpikeSchema.requestParameters());
        String rawOutput = result.finalResponse() == null || result.finalResponse().aiMessage() == null
                ? null : result.finalResponse().aiMessage().text();
        QuizAiOutput output = result.content();
        validateSpikeOutput(output);
        return new QuizSpikeResult(output, rawOutput);
    }

    private void validateRequest(String topic, GradeLevel grade) {
        if (topic == null || topic.isBlank() || grade == null) {
            throw new IllegalArgumentException("Topic and grade are required");
        }
        if (grade != GradeLevel.KINDERGARTEN) {
            throw new IllegalArgumentException("Prompt " + PROMPT_VERSION
                    + " chỉ hỗ trợ KINDERGARTEN; grade hợp lệ của hệ thống: "
                    + String.join(", ", java.util.Arrays.stream(GradeLevel.values()).map(Enum::name).toList()));
        }
    }

    public List<QuizAiQuestion> parseSpikeResult(String rawJson) {
        try {
            validateRawJson(rawJson);
            QuizAiOutput output = objectMapper.readValue(rawJson, QuizAiOutput.class);
            validateSpikeOutput(output);
            return List.copyOf(output.questions());
        } catch (QuizSpikeStructureException | QuizSpikeCriteriaException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new QuizSpikeStructureException("Gemini returned invalid QUIZ JSON", exception);
        }
    }

    private void validateRawJson(String rawJson) {
        var root = objectMapper.readTree(rawJson);
        if (root == null || !root.isObject() || root.size() != 1 || !root.path("questions").isArray()) {
            throw new QuizSpikeStructureException("AI output must be an object containing only questions");
        }
        for (int i = 0; i < root.path("questions").size(); i++) {
            var question = root.path("questions").get(i);
            if (question == null || !question.isObject()
                    || !question.has("text") || !question.has("options") || !question.has("correctIndex")
                    || question.size() < 3 || question.size() > 5
                    || question.properties().stream().anyMatch(entry -> !List.of(
                            "text", "options", "correctIndex", "visualPrompt", "audioText").contains(entry.getKey()))) {
                throw new QuizSpikeStructureException("Question " + i + " has missing or unknown fields");
            }
            if (!question.path("text").isTextual() || !question.path("options").isArray()
                    || !question.path("correctIndex").isIntegralNumber()) {
                throw new QuizSpikeStructureException("Question " + i + " has a field with the wrong type");
            }
            for (String optional : List.of("visualPrompt", "audioText")) {
                if (question.has(optional) && !question.path(optional).isTextual()) {
                    throw new QuizSpikeStructureException("Question " + i + " has a non-string " + optional);
                }
            }
        }
    }

    private void validateSpikeOutput(QuizAiOutput output) {
        if (output == null || output.questions() == null || output.questions().size() != 4) {
            throw new QuizSpikeCriteriaException("Spike requires exactly 4 questions");
        }
        for (int i = 0; i < output.questions().size(); i++) {
            QuizAiQuestion question = output.questions().get(i);
            if (question == null || question.text() == null || question.text().isBlank()) {
                throw new QuizSpikeCriteriaException("Question " + i + " needs non-blank text");
            }
            if (question.text().length() > 200) {
                throw new QuizSpikeStructureException("Question " + i + " text exceeds 200 characters");
            }
            List<String> options = question.options();
            if (options == null || options.size() != 4) {
                throw new QuizSpikeCriteriaException("Question " + i + " needs 4 non-blank options");
            }
            Set<String> seenOptions = new HashSet<>();
            for (String option : options) {
                if (option == null || option.isBlank() || option.length() > 100) {
                    throw new QuizSpikeStructureException("Question " + i + " has an invalid option string");
                }
                if (!option.matches("[1-5]") || !seenOptions.add(option)) {
                    throw new QuizSpikeCriteriaException(
                            "Question " + i + " needs 4 distinct number options from 1 to 5");
                }
            }
            if (question.visualPrompt() != null
                    && (question.visualPrompt().isBlank() || question.visualPrompt().length() > 100)) {
                throw new QuizSpikeStructureException("Question " + i + " has an invalid visualPrompt");
            }
            if (question.audioText() != null
                    && (question.audioText().isBlank() || question.audioText().length() > 200)) {
                throw new QuizSpikeStructureException("Question " + i + " has an invalid audioText");
            }
            if (question.correctIndex() < 0 || question.correctIndex() > 3) {
                throw new QuizSpikeCriteriaException("Question " + i + " needs correctIndex from 0 to 3");
            }
        }
    }
}
