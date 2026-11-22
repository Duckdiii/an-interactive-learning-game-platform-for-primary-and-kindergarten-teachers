package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.Random;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GeminiWordingReviewerTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static GameDsl quiz() {
        var output = MAPPER.readValue("""
                {"title": "Xe gì", "questions": [{"text": "Để chở cỏ, bác dùng xe ...", "options": ["đẩy", "dạp", "chạy"],
                  "correctIndex": 0, "visualPrompt": "xe dạp mô tả cho giáo viên"}]}""", QuizAiOutput.class);
        return GameTestFixtures.factoryRegistry(new Random(1)).create(GameType.QUIZ, output,
                new GameDslRequest("Từ ghép xe đẩy", Subject.VIETNAMESE, GradeLevel.GRADE_3));
    }

    private static ChatModel replying(AtomicReference<ChatRequest> sent, String text) {
        return new ChatModel() {
            @Override
            public ChatResponse doChat(ChatRequest request) {
                sent.set(request);
                return ChatResponse.builder().aiMessage(AiMessage.from(text)).build();
            }
        };
    }

    @Test
    void sendsOnlyChildFacingTextAndKeepsIssuesThatPointToRealText() {
        var sent = new AtomicReference<ChatRequest>();
        GameDsl game = quiz();
        String optionPath = "$.questions[0].options[" + indexOf(game, "dạp") + "].text";
        var reviewer = new GeminiWordingReviewer(replying(sent, """
                {"issues": [
                  {"path": "%s", "text": "dạp", "suggestion": "đạp"},
                  {"path": "$.questions[0].questionText", "text": "không có trong câu", "suggestion": "x"},
                  {"path": "$.khong.ton.tai", "text": "dạp", "suggestion": "đạp"}]}""".formatted(optionPath)), MAPPER);

        var errors = reviewer.review(game, "Từ ghép xe đẩy");

        assertThat(errors).hasSize(1);
        assertThat(errors.getFirst().path()).isEqualTo(optionPath);
        assertThat(errors.getFirst().message()).contains("\"dạp\"", "\"đạp\"");
        String user = ((UserMessage) sent.get().messages().get(1)).singleText();
        assertThat(user).contains("Từ ghép xe đẩy", "Để chở cỏ, bác dùng xe ...", "dạp")
                .doesNotContain("mô tả cho giáo viên").doesNotContain("correctOptionId");
    }

    @Test
    void anUnreadableAnswerIsReportedAsUnavailableSoTheCallerSkipsTheReview() {
        var reviewer = new GeminiWordingReviewer(replying(new AtomicReference<>(), "không phải json"), MAPPER);

        assertThatThrownBy(() -> reviewer.review(quiz(), "x")).isInstanceOf(AiServiceUnavailableException.class);
    }

    private static int indexOf(GameDsl game, String text) {
        var options = MAPPER.valueToTree(game).path("questions").get(0).path("options");
        for (int i = 0; i < options.size(); i++) if (options.get(i).path("text").asString().equals(text)) return i;
        throw new AssertionError(text);
    }
}
