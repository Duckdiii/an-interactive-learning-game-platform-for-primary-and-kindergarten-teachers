package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.*;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.service.curriculum.CurriculumRAGService;
import com.aigameplatform.backend.service.curriculum.CurriculumSource;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GeminiGeneratedContentReviewerTest {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String REVIEW = """
            {"questions":[{"questionId":"q1","answerCorrect":true,"supportedByCurriculum":true,"supportingChunkIds":["math-g1-001"],"reason":"Supported"}]}
            """;

    @Test
    void acceptsOnlyACompleteReviewCitingRetrievedEvidence() {
        AtomicReference<ChatRequest> request = new AtomicReference<>();
        var reviewer = new GeminiGeneratedContentReviewer(model(request, REVIEW), MAPPER, "review-model");

        var result = reviewer.review(game(), "count to five", evidence());

        assertThat(result.accepted()).isTrue();
        assertThat(result.review().status()).isEqualTo(
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.PENDING);
        assertThat(result.review().warnings()).contains("AUTOMATED_REVIEW_ONLY_HUMAN_REVIEW_PENDING");
        assertThat(result.review().reviewerModel()).isEqualTo("review-model");
        assertThat(request.get().parameters().responseFormat()).isNotNull();
    }

    @Test
    void rejectsReviewThatCitesAChunkOutsideTheRetrievedEvidence() {
        String inventedChunk = REVIEW.replace("math-g1-001", "math-g2-001");
        var reviewer = new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), inventedChunk), MAPPER, "review-model");

        var result = reviewer.review(game(), "count to five", evidence());

        assertThat(result.accepted()).isFalse();
        assertThat(result.errors()).extracting(e -> e.path()).contains("$.questions[0].questionText");
    }

    @Test
    void failsClosedWhenReviewerOmitsAQuestion() {
        var reviewer = new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), "{\"questions\":[]}"), MAPPER, "review-model");

        assertThatThrownBy(() -> reviewer.review(game(), "count to five", evidence()))
                .isInstanceOf(AiServiceUnavailableException.class);
    }

    private static ChatModel model(AtomicReference<ChatRequest> request, String responseText) {
        return new ChatModel() {
            @Override public ChatResponse doChat(ChatRequest chatRequest) {
                request.set(chatRequest);
                return ChatResponse.builder().aiMessage(AiMessage.from(responseText)).build();
            }
        };
    }

    private static QuizGameDsl game() {
        var question = new QuizQuestionDsl("q1", 30, 10, null, null, null, null, "How many dots?",
                List.of(new TextChoiceDsl("a", "5"), new TextChoiceDsl("b", "4")), "a");
        return new QuizGameDsl("1.0.0", GameType.QUIZ,
                new GameMetadata("Counting", Subject.MATH, GradeLevel.GRADE_1, "count to five"),
                new GameplaySettings(1.0), List.of(question));
    }

    private static CurriculumEvidence evidence() {
        var source = new CurriculumSource("program.pdf", "a".repeat(64), "32/2018/TT-BGDDT", "math-g1-v1", 200);
        var chunk = new CurriculumRAGService.RetrievedChunk("math-g1-001", Subject.MATH, GradeLevel.GRADE_1,
                "Counting", "Count numbers to 10", 0.91, "program.pdf", List.of(1), List.of(1), "32/2018/TT-BGDDT");
        return CurriculumEvidence.from(source, "fixture", List.of(chunk));
    }
}
