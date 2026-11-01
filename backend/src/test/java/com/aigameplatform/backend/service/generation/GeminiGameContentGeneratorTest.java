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
    void nonPilotScopeUsesGroundedScopeAwarePromptInsteadOfMathGradeOneStrategy() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        String context = "[en-g3-003] Listening outcome\nLĩnh vực: LANGUAGE; độ tuổi phù hợp: 8–9\n"
                + "Nguồn: curriculum.pdf; PDF 1275; printed 26\nProvenance: sourceSha256=" + "a".repeat(64)
                + "; datasetVersion=english-grade3-draft-v1; embeddingModel=gemini-embedding-001";
        var attempt = new GenerationAttempt(GameType.QUIZ, "Nghe và trả lời câu hỏi quen thuộc",
                Subject.ENGLISH, GradeLevel.GRADE_3, new QuizGameStrategy(MAPPER).getStructuredSchema(),
                context, 1, null, List.of());

        assertThat(generator.generate(attempt)).isEqualTo(OUTPUT);

        String systemPrompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        assertThat(systemPrompt).contains("Môn học: ENGLISH", "Khối lớp: GRADE_3", attempt.topic(), context,
                "exact curriculum evidence", "exactly 4 questions")
                .doesNotContain("Toán lớp 1", "6–7 tuổi", "2 + 3 = ?");
    }

    @Test
    void groundedPromptCarriesEveryNonPilotPrimarySubjectAndGrade() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        String provenance = "\nNguồn: curriculum.pdf; PDF 10; printed 2\nProvenance: sourceSha256=" + "b".repeat(64)
                + "; datasetVersion=scope-test-v1; embeddingModel=gemini-embedding-001";
        var scopes = new java.util.ArrayList<java.util.Map.Entry<Subject, GradeLevel>>();
        for (Subject subject : List.of(Subject.MATH, Subject.VIETNAMESE, Subject.ENGLISH)) {
            for (GradeLevel grade : List.of(GradeLevel.GRADE_1, GradeLevel.GRADE_2, GradeLevel.GRADE_3,
                    GradeLevel.GRADE_4, GradeLevel.GRADE_5)) {
                if (subject != Subject.MATH || grade != GradeLevel.GRADE_1) {
                    scopes.add(java.util.Map.entry(subject, grade));
                }
            }
        }

        for (var scope : scopes) {
            String context = "[scope-outcome] Exact outcome" + provenance;
            var attempt = new GenerationAttempt(GameType.QUIZ, "teacher's natural request", scope.getKey(),
                    scope.getValue(), new QuizGameStrategy(MAPPER).getStructuredSchema(), context, 1, null, List.of());

            assertThat(generator.generate(attempt)).isEqualTo(OUTPUT);
            String prompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
            assertThat(prompt).contains("Môn học: " + scope.getKey().name(),
                    "Khối lớp: " + scope.getValue().name(), "teacher's natural request", context);
            assertThat(prompt).doesNotContain("Toán lớp 1", "6–7 tuổi", "2 + 3 = ?");
        }
    }

    @Test
    void kindergartenPromptRetainsRetrievedAgeAndDomainEvidence() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        String context = "[kg-4-5-001] Kết quả mong đợi\nĐộ tuổi phù hợp: 4–5 tuổi\n"
                + "Domain: COGNITIVE; subDomain: MATHEMATICAL_CONCEPTS\nNguồn: curriculum.pdf; PDF 10\n"
                + "Provenance: sourceSha256=" + "c".repeat(64)
                + "; datasetVersion=kindergarten-outcomes-v1; embeddingModel=gemini-embedding-001";
        var attempt = new GenerationAttempt(GameType.QUIZ, "Phân loại đồ vật", Subject.MATH,
                GradeLevel.KINDERGARTEN, new QuizGameStrategy(MAPPER).getStructuredSchema(), context, 1, null, List.of());

        generator.generate(attempt);

        String prompt = SystemMessage.findFirst(sent.get().messages()).orElseThrow().text();
        assertThat(prompt).contains("Khối lớp: KINDERGARTEN", "Độ tuổi phù hợp: 4–5 tuổi",
                "Domain: COGNITIVE", "subDomain: MATHEMATICAL_CONCEPTS", "kindergarten-outcomes-v1")
                .doesNotContain("Toán lớp 1", "2 + 3 = ?");
    }

    @Test
    void nonPilotScopeWithoutProvenanceIsRejectedBeforeCallingGemini() {
        AtomicReference<ChatRequest> sent = new AtomicReference<>();
        var generator = new GeminiGameContentGenerator(modelCapturing(sent),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
        var attempt = new GenerationAttempt(GameType.QUIZ, "Count to 20", Subject.MATH, GradeLevel.GRADE_2,
                new QuizGameStrategy(MAPPER).getStructuredSchema(), "unverified text only", 1, null, List.of());

        assertThatThrownBy(() -> generator.generate(attempt))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
        assertThat(sent).hasValue(null);
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
