package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.media.GameAudioEnricher;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.GameValidationService;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Làm lại một câu hỏi DSL: bộ sinh AI được mock, strategy và ánh xạ DSL ↔ entity là thật. */
class DslGameContentHandlerRegenerateTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final GameGenerationService generation = mock(GameGenerationService.class);
    private final GameAudioEnricher enricher = mock(GameAudioEnricher.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<GameAudioEnricher> enrichers = mock(ObjectProvider.class);
    private final DslGameContentHandler handler;

    DslGameContentHandlerRegenerateTest() {
        when(enrichers.getIfAvailable()).thenReturn(enricher);
        handler = new DslGameContentHandler(generation,
                new GameValidationService(GameTestFixtures.schemaAndBusinessRuleValidators(MAPPER), MAPPER),
                new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)), MAPPER, enrichers);
    }

    private static ObjectNode quizResponse() throws Exception {
        try (InputStream in = DslGameContentHandlerRegenerateTest.class.getResourceAsStream("/dsl-examples/quiz.json")) {
            ObjectNode response = (ObjectNode) MAPPER.readTree(in);
            response.put("gameId", "g1").put("status", "DRAFT").put("updatedAt", "t");
            return response;
        }
    }

    private static QuizQuestionDsl candidate(String id) {
        return new QuizQuestionDsl(id, 30, 10, "Tính nhẩm: 3 + 3 = ?", null, null, null, "3 + 3 = ?",
                List.of(new TextChoiceDsl("opt_0", "6"), new TextChoiceDsl("opt_1", "7")), "opt_0");
    }

    @Test
    void regeneratedQuestionKeepsTheTargetIdAndGetsTheVoiceOver() throws Exception {
        // AI trả id khác id của thẻ bị thay: kết quả vẫn phải mang id của thẻ.
        when(generation.regenerateQuestion(eq(GameType.QUIZ), any(), any(), eq("làm dễ hơn"), eq("q1"), any()))
                .thenReturn(candidate("q9"));
        doAnswer(inv -> {
            List<QuestionGame> questions = inv.getArgument(0);
            questions.forEach(q -> q.setAudioUrl("https://storage.example/audio.mp3"));
            return null;
        }).when(enricher).enrichAllQuestionsWithAudio(any());

        RegeneratedQuestionDto result = handler.regenerateQuestion(quizResponse(), "q1", "làm dễ hơn");

        assertThat(result.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(result.question().id()).isEqualTo("q1");
        assertThat(((QuizQuestionDsl) result.question()).questionText()).isEqualTo("3 + 3 = ?");
        assertThat(result.question().audioUrl()).isEqualTo("https://storage.example/audio.mp3");
    }

    @Test
    void unknownQuestionIdIsNotFoundAndAiIsNotCalled() throws Exception {
        assertThatThrownBy(() -> handler.regenerateQuestion(quizResponse(), "q99", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
        verify(generation, never()).regenerateQuestion(any(), any(), any(), any(), any(), any());
    }

    @Test
    void imageModeGamesAreRejectedWith400() throws Exception {
        ObjectNode response = quizResponse();
        response.put("mode", "IMAGE");

        assertThatThrownBy(() -> handler.regenerateQuestion(response, "q1", null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        verify(generation, never()).regenerateQuestion(any(), any(), any(), any(), any(), any());
    }
}
