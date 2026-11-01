package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.GenerationScopeUnsupportedException;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.QuizGameStrategy;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.ValidationError;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GeminiGameContentGeneratorTest {

    private static final String CURRICULUM = "[math-g1-007] Cộng trong phạm vi 10. Nguồn TT32/2018, PDF 188.";
    private static final String OUTPUT = "{\"questions\":[]}";
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Test
    void retrievedCurriculumIsIncludedInTheSystemPromptBeforeCallingGemini() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        ChatModel fakeModel = modelCapturing(sent);
        var registry = new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER));
        var generator = new GeminiGameContentGenerator(fakeModel, registry);
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        String result = generator.generate(attempt(quiz, CURRICULUM, 1, null, List.of()));

        assertThat(result).isEqualTo(OUTPUT);
        String systemPrompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        assertThat(systemPrompt).contains(CURRICULUM)
                .contains("<curriculum_context>")
                .contains("Chủ đề: Đếm con vật")
                .contains("không tự mở rộng");
        assertThat(sent.get().parameters().responseFormat()).isNotNull();
    }

    @Test
    void retryKeepsCurriculumInSystemPromptAndSendsValidationFeedbackAsUserMessage() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        generator.generate(attempt(quiz, CURRICULUM, 2, OUTPUT,
                List.of(new ValidationError("$.questions", "phải có ít nhất một câu"))));

        String systemPrompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        String userPrompt = UserMessage.findLast(sent.get().messages()).orElseThrow().singleText();
        assertThat(systemPrompt).contains(CURRICULUM);
        assertThat(userPrompt).contains("phải có ít nhất một câu").contains(OUTPUT);
    }

    @Test
    void arithmeticPilotPromptRequiresTheSameExplicitFormThatTheDeterministicVerifierChecks() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        generator.generate(attempt(quiz, CURRICULUM, "Phép cộng nhẩm trong phạm vi 10", 1, null, List.of()));

        String systemPrompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        assertThat(systemPrompt).contains("2 + 3 = ?", "5 - 2 = ?", "bài toán kể chuyện", "Tính nhẩm:");
    }

    @Test
    void arithmeticFormattingInstructionDoesNotRewriteNonArithmeticTeacherRequests() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        generator.generate(attempt(quiz, CURRICULUM, "Đếm con vật", 1, null, List.of()));

        String systemPrompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        assertThat(systemPrompt).doesNotContain("2 + 3 = ?", "bài toán kể chuyện");
    }

    @Test
    void retryExplainsHowToRestoreTheRequestedMentalArithmeticMarker() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        generator.generate(attempt(quiz, CURRICULUM, "Phép cộng nhẩm trong phạm vi 10", 2, OUTPUT,
                List.of(new ValidationError("$.questions[0]", "MENTAL_ARITHMETIC_NOT_EXPLICIT_IN_QUESTION"))));

        String userPrompt = UserMessage.findLast(sent.get().messages()).orElseThrow().singleText();
        assertThat(userPrompt).contains("Tính nhẩm:", "2 + 3 = ?");
    }

    @Test
    void retryForNonArithmeticRequestDoesNotChangeTheTeachersRequestedSkill() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        generator.generate(attempt(quiz, CURRICULUM, "Đếm con vật", 2, OUTPUT,
                List.of(new ValidationError("$.questions[0]", "QUESTION_NOT_MACHINE_CHECKABLE"))));

        String systemPrompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        String userPrompt = UserMessage.findLast(sent.get().messages()).orElseThrow().singleText();
        assertThat(systemPrompt).doesNotContain("2 + 3 = ?", "bài toán kể chuyện");
        assertThat(userPrompt).doesNotContain("2 + 3 = ?", "bài toán kể chuyện", "ký hiệu + hoặc -");
    }

    @Test
    void retryForArithmeticRequestGivesSpecificMachineCheckCorrection() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        QuizGameStrategy quiz = new QuizGameStrategy(MAPPER);

        generator.generate(attempt(quiz, CURRICULUM, "Phép cộng nhẩm trong phạm vi 10", 2, OUTPUT,
                List.of(new ValidationError("$.questions[0]", "QUESTION_NOT_MACHINE_CHECKABLE"))));

        String userPrompt = UserMessage.findLast(sent.get().messages()).orElseThrow().singleText();
        assertThat(userPrompt).contains("2 + 3 = ?", "không dùng bài toán kể chuyện");
    }

    @Test
    void pilotGeneratorRejectsUnsupportedGameTypesWithAClientError() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        GenerationAttempt quizAttempt = attempt(new QuizGameStrategy(MAPPER), CURRICULUM, 1, null, List.of());
        GenerationAttempt otherGame = new GenerationAttempt(GameType.WORD_SCRAMBLE, quizAttempt.topic(),
                quizAttempt.subject(), quizAttempt.gradeLevel(), quizAttempt.structuredSchema(), CURRICULUM,
                1, null, List.of());

        assertThatThrownBy(() -> generator.generate(otherGame))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
        assertThat(sent).hasValue(null);
    }

    private static ChatModel modelCapturing(AtomicReference<ChatRequest> sent) {
        return new ChatModel() {
            @Override
            public ChatResponse doChat(ChatRequest request) {
                sent.set(request);
                return ChatResponse.builder().aiMessage(AiMessage.from(OUTPUT)).build();
            }
        };
    }

    private static GenerationAttempt attempt(QuizGameStrategy quiz, String context, int number,
                                               String previousOutput, List<ValidationError> previousErrors) {
        return attempt(quiz, context, "Đếm con vật", number, previousOutput, previousErrors);
    }

    private static GenerationAttempt attempt(QuizGameStrategy quiz, String context, String topic, int number,
                                               String previousOutput, List<ValidationError> previousErrors) {
        return new GenerationAttempt(GameType.QUIZ, topic, Subject.MATH, GradeLevel.GRADE_1,
                quiz.getStructuredSchema(), context, number, previousOutput, previousErrors);
    }
}
