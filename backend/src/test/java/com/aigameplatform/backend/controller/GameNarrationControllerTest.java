package com.aigameplatform.backend.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.narration.GameNarrationService;
import com.aigameplatform.backend.service.narration.NarrationFeedbackService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class GameNarrationControllerTest {
    @Mock private GameNarrationService narration;
    @Mock private NarrationFeedbackService feedback;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new GameNarrationController(narration, feedback))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
    }

    @AfterEach
    void clearPrincipal() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void exposesFixedFeedbackUrlsForTheAuthenticatedTeacherAndGame() throws Exception {
        var teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.invalid", "session-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(teacher, "", List.of()));
        when(feedback.getFeedbackAudioUrls("game-1", teacher))
                .thenReturn(new NarrationFeedbackService.FeedbackAudioUrls(
                        "https://storage.test/correct", "https://storage.test/wrong"));

        mvc.perform(post("/api/games/game-1/narration/feedback"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.correctAudioUrl").value("https://storage.test/correct"))
                .andExpect(jsonPath("$.data.wrongAudioUrl").value("https://storage.test/wrong"));

        verify(feedback).getFeedbackAudioUrls("game-1", teacher);
    }
}
