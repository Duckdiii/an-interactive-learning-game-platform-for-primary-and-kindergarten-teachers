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

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.media.GameAudioEnricher;
import com.aigameplatform.backend.dto.media.SpeechVoice;
import com.aigameplatform.backend.dto.request.RegenerateGameRequest;
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

    @Test
    void wholeGameUsesSavedSubjectAndGradeAndReturnsGeneratedQuestions() throws Exception {
        var saved = quizResponse();
        var payload = saved.deepCopy();
        payload.remove(List.of("gameId", "status", "updatedAt"));
        var generated = MAPPER.treeToValue(payload, GameDsl.class);
        when(generation.regenerateGame(eq(GameType.QUIZ), any(), eq("de hon"))).thenReturn(generated);

        ObjectNode preview = handler.regenerate(saved, new RegenerateGameRequest("Chủ đề mới hôm nay", "de hon", SpeechVoice.MALE));

        assertThat(preview.path("questions").size()).isEqualTo(generated.questions().size());
        var input = org.mockito.ArgumentCaptor.forClass(GameDslRequest.class);
        verify(generation).regenerateGame(eq(GameType.QUIZ), input.capture(), eq("de hon"));
        assertThat(input.getValue().topic()).isEqualTo("Chủ đề mới hôm nay");
        assertThat(input.getValue().subject()).isEqualTo(generated.metadata().subject());
        assertThat(input.getValue().gradeLevel()).isEqualTo(generated.metadata().gradeLevel());
        verify(enricher).enrichAllQuestionsWithAudio(any(), eq(SpeechVoice.MALE));
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
        }).when(enricher).enrichAllQuestionsWithAudio(any(), eq(SpeechVoice.FEMALE));

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
    void visualClozeRegeneratesAgainstTheSavedSceneAndTeacherAssets() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/dsl-examples/visual-cloze-image-v1.1.json")) {
            ObjectNode response = (ObjectNode) MAPPER.readTree(in);
            var game = MAPPER.treeToValue(response, GameDsl.class);
            var original = (VisualClozeQuestionDsl) game.questions().getFirst();
            when(generation.regenerateQuestion(eq(GameType.VISUAL_CLOZE), any(), eq(original), eq("Đổi vị trí"),
                    eq("q1"), eq(game))).thenReturn(original);

            doAnswer(inv -> {
                List<QuestionGame> questions = inv.getArgument(0);
                questions.getFirst().setAudioUrl("https://storage.example/voice.mp3");
                return null;
            }).when(enricher).enrichAllQuestionsWithAudio(any(), eq(SpeechVoice.MALE));

            var result = handler.regenerateQuestion(response, "q1", "Đổi vị trí", SpeechVoice.MALE);

            assertThat(result.schemaVersion()).isEqualTo("1.2.0");
            assertThat(result.question().audioUrl()).isEqualTo("https://storage.example/voice.mp3");
            assertThat(((VisualClozeQuestionDsl) result.question()).options()).isEqualTo(original.options());
            var request = org.mockito.ArgumentCaptor.forClass(GameDslRequest.class);
            verify(generation).regenerateQuestion(eq(GameType.VISUAL_CLOZE), request.capture(), eq(original),
                    eq("Đổi vị trí"), eq("q1"), eq(game));
            assertThat(request.getValue().effectiveVisualClozeMode()).isEqualTo(VisualClozeMode.IMAGE);
            assertThat(request.getValue().sceneImageUrl()).isEqualTo(original.sceneImageUrl());
            assertThat(request.getValue().optionImages()).extracting(option -> option.imageUrl())
                    .containsExactlyElementsOf(original.options().stream().map(option -> option.imageUrl()).toList());
        }
    }
}
