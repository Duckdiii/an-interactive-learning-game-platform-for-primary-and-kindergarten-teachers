package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.dto.response.QuizAiQuestionDraft;
import dev.langchain4j.exception.AuthenticationException;
import dev.langchain4j.exception.HttpException;
import dev.langchain4j.exception.RateLimitException;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

public final class QuizGeminiSpikeRunner {

    private QuizGeminiSpikeRunner() {
    }

    public static void main(String[] args) throws IOException {
        System.setOut(new PrintStream(System.out, true, StandardCharsets.UTF_8));
        if (args.length == 1 && "--check-utf8".equals(args[0])) {
            System.out.println("UTF-8: Có 2 con mèo. Có tất cả bao nhiêu con mèo?");
            return;
        }
        if (args.length < 3 || !("--initial".equals(args[0]) || "--measure".equals(args[0]))) {
            throw new IllegalArgumentException(
                    "Usage: QuizGeminiSpikeRunner --check-utf8 | <--initial|--measure> <topic> <KINDERGARTEN|ELEMENTARY>");
        }
        String apiKey = System.getenv("GEMINI_API_KEY");
        String modelName = System.getenv("GEMINI_MODEL");
        if (apiKey == null || apiKey.isBlank() || modelName == null || modelName.isBlank()) {
            throw new IllegalStateException("Set GEMINI_API_KEY and GEMINI_MODEL before running the spike");
        }

        var model = GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .responseFormat(QuizSpikeSchema.responseFormat())
                .maxRetries(0)
                .build();
        var objectMapper = new ObjectMapper();
        var service = new QuizSpikeContentService(model, objectMapper);
        String phase = "--initial".equals(args[0]) ? "initial" : "measurement";
        String topic = String.join(" ", Arrays.copyOfRange(args, 1, args.length - 1));
        GradeLevel grade = GradeLevel.valueOf(args[args.length - 1]);
        Path output = Path.of("target", "quiz-spike", phase + "-" + DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
                .withZone(ZoneOffset.UTC).format(Instant.now()) + ".jsonl");
        Files.createDirectories(output.getParent());
        System.out.println("Result file: " + output.toAbsolutePath());

        if ("initial".equals(phase)) {
            String category = runAttempt(service, objectMapper, output, modelName, topic, grade, phase, 1);
            if (!"SUCCESS".equals(category)) {
                throw new IllegalStateException("Initial attempt failed: " + category);
            }
            return;
        }
        for (int attempt = 1; attempt <= 10; attempt++) {
            String category = runAttempt(service, objectMapper, output, modelName, topic, grade, phase, attempt);
            if (List.of("AUTHENTICATION", "PERMISSION", "QUOTA").contains(category)) {
                throw new IllegalStateException("Stopped measurement after " + category + " error");
            }
        }
    }

    private static String runAttempt(QuizSpikeContentService service, ObjectMapper objectMapper,
                                     Path output, String modelName, String topic, GradeLevel grade,
                                     String phase, int attempt)
            throws IOException {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("phase", phase);
        result.put("attempt", attempt);
        result.put("startedAt", Instant.now().toString());
        result.put("model", modelName);
        result.put("topic", topic);
        result.put("grade", grade.name());
        result.put("promptVersion", QuizSpikeContentService.PROMPT_VERSION);
        long started = System.nanoTime();
        String raw = null;
        String category;
        try {
            raw = service.generateRaw(topic, grade);
            var questions = service.parseSpikeResult(raw);
            category = "SUCCESS";
            result.put("questions", questions);
            printQuestions(questions);
        } catch (RuntimeException exception) {
            category = classify(exception);
            result.put("errorClass", exception.getClass().getSimpleName());
        }
        result.put("latencyMs", (System.nanoTime() - started) / 1_000_000);
        result.put("category", category);
        if (raw != null) {
            result.put("rawOutput", raw);
        }
        Files.writeString(output, objectMapper.writeValueAsString(result) + System.lineSeparator(),
                StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        System.out.printf("%s %d: %s (%s ms)%n", phase, attempt, category, result.get("latencyMs"));
        return category;
    }

    private static String classify(RuntimeException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof AuthenticationException) {
                return "AUTHENTICATION";
            }
            if (cause instanceof RateLimitException) {
                return "QUOTA";
            }
            if (cause instanceof HttpException httpException) {
                if (httpException.statusCode() == 401) {
                    return "AUTHENTICATION";
                }
                if (httpException.statusCode() == 403) {
                    return "PERMISSION";
                }
                if (httpException.statusCode() == 429) {
                    return "QUOTA";
                }
                return "HTTP_" + httpException.statusCode();
            }
        }
        return exception instanceof IllegalArgumentException ? "INVALID_OUTPUT" : "OTHER_ERROR";
    }

    private static void printQuestions(List<QuizAiQuestionDraft> questions) {
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
