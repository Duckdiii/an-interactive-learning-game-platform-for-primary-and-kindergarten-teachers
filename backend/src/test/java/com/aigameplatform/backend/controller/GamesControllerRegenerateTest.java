package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.GameService;
import com.aigameplatform.backend.service.GamePublicationService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class GamesControllerRegenerateTest {

    @Mock
    private GameService games;

    @Mock
    private GamePublicationService publication;

    private MockMvc mockMvc;
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new GamesController(games, publication))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        var auth = new UsernamePasswordAuthenticationToken(teacher, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void regenerateQuestionReturns200WithQuestionEnvelope() throws Exception {
        var question = new QuizQuestionDsl("q2", 30, 10, "Nghe", "https://audio.mp3", null, null,
                "Câu hỏi mới", List.of(new TextChoiceDsl("opt_0", "Đáp án A")), "opt_0");
        var responseDto = new RegeneratedQuestionDto(question, GameType.QUIZ);

        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q2"), any()))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/games/g1/questions/q2/regenerate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"làm cho câu hỏi dễ hơn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.gameType").value("QUIZ"))
                .andExpect(jsonPath("$.data.question.id").value("q2"))
                .andExpect(jsonPath("$.data.question.questionText").value("Câu hỏi mới"))
                .andExpect(jsonPath("$.data.question.audioUrl").value("https://audio.mp3"));

        verify(games).regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q2"), any());
    }

    @Test
    void regenerateQuestionWithoutBodySucceeds() throws Exception {
        var question = new QuizQuestionDsl("q1", 30, 10, null, null, null, null,
                "Câu hỏi 1", List.of(new TextChoiceDsl("opt_0", "Đáp án")), "opt_0");
        var responseDto = new RegeneratedQuestionDto(question, GameType.QUIZ);

        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q1"), any()))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/games/g1/questions/q1/regenerate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.question.id").value("q1"));
    }

    @Test
    void regenerateQuestionWithOverlyLongFeedbackReturns400() throws Exception {
        String longFeedback = "a".repeat(501);

        mockMvc.perform(post("/api/games/g1/questions/q2/regenerate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"" + longFeedback + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void regenerateQuestionPropagatesConflictWhenActiveSession() throws Exception {
        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q2"), any()))
                .thenThrow(new ApiException(ErrorCode.CONFLICT, "Game has an active session"));

        mockMvc.perform(post("/api/games/g1/questions/q2/regenerate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    void regenerateQuestionPropagatesForbiddenWhenNotOwner() throws Exception {
        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q2"), any()))
                .thenThrow(new ApiException(ErrorCode.FORBIDDEN, "Not your game"));

        mockMvc.perform(post("/api/games/g1/questions/q2/regenerate"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void regenerateQuestionPropagatesNotFoundWhenGameOrQuestionMissing() throws Exception {
        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q99"), any()))
                .thenThrow(new ApiException(ErrorCode.NOT_FOUND, "Question not found"));

        mockMvc.perform(post("/api/games/g1/questions/q99/regenerate"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void regenerateQuestionPropagatesUnsafeContent() throws Exception {
        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q2"), any()))
                .thenThrow(new ApiException(ErrorCode.UNSAFE_CONTENT, "Nội dung không phù hợp"));

        mockMvc.perform(post("/api/games/g1/questions/q2/regenerate"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNSAFE_CONTENT"));
    }

    @Test
    void regenerateQuestionPropagatesAiTimeout() throws Exception {
        when(games.regenerateQuestion(eq("teacher-1"), eq("g1"), eq("q2"), any()))
                .thenThrow(new ApiException(ErrorCode.AI_GENERATION_TIMEOUT, "AI Timeout"));

        mockMvc.perform(post("/api/games/g1/questions/q2/regenerate"))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AI_GENERATION_TIMEOUT"));
    }
}
