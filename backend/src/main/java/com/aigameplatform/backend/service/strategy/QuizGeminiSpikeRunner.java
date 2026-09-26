package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.model.chat.request.ResponseFormat;
import java.util.Arrays;
import tools.jackson.databind.ObjectMapper;

public final class QuizGeminiSpikeRunner {

    private QuizGeminiSpikeRunner() {
    }

    public static void main(String[] args) {
        if (args.length < 2) {
            throw new IllegalArgumentException("Usage: QuizGeminiSpikeRunner <topic> <KINDERGARTEN|ELEMENTARY>");
        }
        String apiKey = System.getenv("GEMINI_API_KEY");
        String modelName = System.getenv("GEMINI_MODEL");
        if (apiKey == null || apiKey.isBlank() || modelName == null || modelName.isBlank()) {
            throw new IllegalStateException("Set GEMINI_API_KEY and GEMINI_MODEL before running the spike");
        }

        var model = GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .responseFormat(ResponseFormat.JSON)
                .build();
        var service = new QuizSpikeContentService(model, new ObjectMapper());
        String topic = String.join(" ", Arrays.copyOf(args, args.length - 1));
        var questions = service.generate(topic, GradeLevel.valueOf(args[args.length - 1]));
        for (int i = 0; i < questions.size(); i++) {
            var question = questions.get(i);
            System.out.printf("%d. %s%n", i + 1, question.getText());
            for (int j = 0; j < question.getOptions().size(); j++) {
                System.out.printf("  %d: %s%n", j, question.getOptions().get(j));
            }
            System.out.printf("  correctIndex: %d%n", question.getCorrectIndex());
        }
    }
}
