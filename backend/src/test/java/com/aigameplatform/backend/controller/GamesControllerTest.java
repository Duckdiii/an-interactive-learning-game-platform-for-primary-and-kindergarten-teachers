package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.response.GameSummaryResponse;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.GameService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class GamesControllerTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Mock private GameService games;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new GamesController(games))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedTeacher("teacher-1", "t@example.invalid", "s"), "", List.of()));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generateReturnsTheGameInTheSuccessEnvelope() throws Exception {
        when(games.generate(eq("teacher-1"), any())).thenReturn(
                MAPPER.createObjectNode().put("gameId", "g").put("gameType", "CUSTOM").put("status", "DRAFT"));

        mvc.perform(post("/api/games/generate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"idea\":\"Bé hứng táo số chẵn\",\"gameType\":\"CUSTOM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.gameType").value("CUSTOM"));

        ArgumentCaptor<GenerateGameRequest> request = ArgumentCaptor.forClass(GenerateGameRequest.class);
        verify(games).generate(eq("teacher-1"), request.capture());
        org.assertj.core.api.Assertions.assertThat(request.getValue().gameType()).isEqualTo(GameType.CUSTOM);
        org.assertj.core.api.Assertions.assertThat(request.getValue().subject()).isEqualTo(Subject.MATH);
    }

    @Test
    void generateWithoutSubjectIs400() throws Exception {
        mvc.perform(post("/api/games/generate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gradeLevel\":\"GRADE_1\",\"idea\":\"Bé hứng táo số chẵn\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void generateWithTooShortIdeaIs400() throws Exception {
        mvc.perform(post("/api/games/generate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"idea\":\"ngắn\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unsafeContentIs422() throws Exception {
        when(games.generate(eq("teacher-1"), any())).thenThrow(new UnsafeContentException("Nội dung không phù hợp với trẻ em"));

        mvc.perform(post("/api/games/generate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"idea\":\"Bé hứng táo số chẵn\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.error.code").value("UNSAFE_CONTENT"));
    }

    @Test
    void listPassesFilters() throws Exception {
        when(games.list("teacher-1", Subject.MATH, GradeLevel.GRADE_1, null)).thenReturn(List.of(new GameSummaryResponse(
                "g", "Hứng táo", "CUSTOM", "MATH", "GRADE_1", "DRAFT", null, null, null, Instant.EPOCH)));

        mvc.perform(get("/api/games").param("subject", "MATH").param("gradeLevel", "GRADE_1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].gameId").value("g"))
                .andExpect(jsonPath("$.data[0].gameType").value("CUSTOM"));
    }

    @Test
    void forbiddenGameIs403() throws Exception {
        when(games.get("teacher-1", "g")).thenThrow(new ApiException(ErrorCode.FORBIDDEN, "Bạn không có quyền với trò chơi này"));

        mvc.perform(get("/api/games/g"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void updateSendsTheRawBody() throws Exception {
        when(games.update(eq("teacher-1"), eq("g"), any())).thenReturn(MAPPER.createObjectNode().put("gameId", "g"));

        mvc.perform(put("/api/games/g").contentType(MediaType.APPLICATION_JSON).content("{\"kind\":\"CPF\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gameId").value("g"));
    }

    @Test
    void deleteIs204() throws Exception {
        mvc.perform(delete("/api/games/g")).andExpect(status().isNoContent());
        verify(games).delete("teacher-1", "g");
    }

    @Test
    void reviseReturnsTheRevisedGame() throws Exception {
        when(games.revise(eq("teacher-1"), eq("g1"), any())).thenReturn(MAPPER.createObjectNode().put("gameId", "g1").put("gameType", "QUIZ"));

        mvc.perform(post("/api/games/g1/revise").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"instruction\":\"Câu 2 đổi thành phép trừ\",\"history\":[{\"role\":\"TEACHER\",\"text\":\"dễ hơn\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gameId").value("g1"));
    }

    @Test
    void reviseWithoutInstructionIs400() throws Exception {
        mvc.perform(post("/api/games/g1/revise").contentType(MediaType.APPLICATION_JSON).content("{\"instruction\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void reviseOverTheLimitIs429WithRetryAfter() throws Exception {
        when(games.revise(eq("teacher-1"), eq("g1"), any()))
                .thenThrow(new com.aigameplatform.backend.exception.RateLimitedException("chậm lại", 17));

        mvc.perform(post("/api/games/g1/revise").contentType(MediaType.APPLICATION_JSON).content("{\"instruction\":\"dễ hơn\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Retry-After", "17"))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }
}
