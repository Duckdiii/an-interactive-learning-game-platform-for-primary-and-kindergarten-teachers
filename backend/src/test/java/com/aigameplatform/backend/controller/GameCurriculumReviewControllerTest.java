package com.aigameplatform.backend.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class GameCurriculumReviewControllerTest {
    @Mock private GameCurriculumReviewService service;
    private MockMvc mvc;

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new GameCurriculumReviewController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
    }

    @AfterEach void clearPrincipal() { SecurityContextHolder.clearContext(); }

    @Test void reviewEndpointReturnsOnlySeparateReviewForAuthenticatedTeacher() throws Exception {
        var teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.invalid", "session-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(teacher, "", List.of()));
        var mapper = new JsonMapper();
        var view = new GameCurriculumReviewService.ReviewView(UUID.randomUUID(), "game-1", Instant.EPOCH,
                CurriculumEvidenceReview.Status.UNAVAILABLE, mapper.readTree("{\"chunks\":[{\"chunkId\":\"outcome-1\",\"ageBand\":\"AGE_3_4\"}]}"),
                mapper.readTree("[]"), mapper.readTree("[\"REVIEWER_NOT_CONFIGURED\"]"),
                "preschool-v1", "curriculum-v1", "gemini-embedding-001", null,
                "Nội dung tương ứng kết quả mong đợi của trẻ 3–4 tuổi.");
        when(service.getForTeacher("game-1", "teacher-1")).thenReturn(view);

        mvc.perform(get("/api/games/game-1/curriculum-review"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.data.evidence.chunks[0].chunkId").value("outcome-1"))
                .andExpect(jsonPath("$.data.curriculumLabel").value("Nội dung tương ứng kết quả mong đợi của trẻ 3–4 tuổi."))
                .andExpect(jsonPath("$.data.game").doesNotExist())
                .andExpect(jsonPath("$.data.metadata.curriculumReview").doesNotExist());
        verify(service).getForTeacher("game-1", "teacher-1");
    }

    @Test void missingTeacherPrincipalReturnsUnauthorizedEnvelope() throws Exception {
        when(service.getForTeacher("game-1", null)).thenThrow(
                new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên"));
        mvc.perform(get("/api/games/game-1/curriculum-review"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
}
