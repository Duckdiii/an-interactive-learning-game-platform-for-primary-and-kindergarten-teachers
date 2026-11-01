package com.aigameplatform.backend.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.dsl.*;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameGenerationApplicationService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class GameGenerationControllerTest {
    @Mock private GameGenerationApplicationService service;
    private MockMvc mvc;

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new GameGenerationController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
    }
    @AfterEach void clearPrincipal() { SecurityContextHolder.clearContext(); }

    @Test void createsDraftAndReturnsCurriculumOutsideFrozenDsl() throws Exception {
        var teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.invalid", "session-1");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(teacher, "", List.of()));
        var game = new QuizGameDsl("1.0.0", com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                new GameMetadata("Cộng trong 10", com.aigameplatform.backend.entity.enums.Subject.MATH,
                        com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, "cộng trong phạm vi 10"),
                new GameplaySettings(1.5), List.of());
        var result = new GameGenerationApplicationService.GeneratedGame("game-1", game,
                new GameGenerationApplicationService.CurriculumView(CurriculumEvidence.empty(),
                        CurriculumEvidenceReview.unavailable()));
        when(service.generateAndSave(com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                new GameDslRequest("cộng trong phạm vi 10", com.aigameplatform.backend.entity.enums.Subject.MATH,
                        com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, null), "teacher-1")).thenReturn(result);

        mvc.perform(post("/api/games/generate").contentType("application/json").content("""
                {"gameType":"QUIZ","topic":"cộng trong phạm vi 10","subject":"MATH","gradeLevel":"GRADE_1"}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gameId").value("game-1"))
                .andExpect(jsonPath("$.data.game.schemaVersion").value("1.0.0"))
                .andExpect(jsonPath("$.data.game.metadata.curriculumReview").doesNotExist())
                .andExpect(jsonPath("$.data.curriculum.review.status").value("UNAVAILABLE"));
        verify(service).generateAndSave(com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                new GameDslRequest("cộng trong phạm vi 10", com.aigameplatform.backend.entity.enums.Subject.MATH,
                        com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, null), "teacher-1");
    }

    @Test void requiresTeacherPrincipal() throws Exception {
        when(service.generateAndSave(com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                new GameDslRequest("topic", com.aigameplatform.backend.entity.enums.Subject.MATH,
                        com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1, null), null))
                .thenThrow(new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập"));
        mvc.perform(post("/api/games/generate").contentType("application/json").content("""
                {"gameType":"QUIZ","topic":"topic","subject":"MATH","gradeLevel":"GRADE_1"}
                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test void rejectsInvalidOrOversizedTopicBeforeCallingGeneration() throws Exception {
        mvc.perform(post("/api/games/generate").contentType("application/json").content("""
                {"gameType":"QUIZ","topic":"%s","subject":"MATH","gradeLevel":"GRADE_1"}
                """.formatted("x".repeat(201))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(service);
    }
}
