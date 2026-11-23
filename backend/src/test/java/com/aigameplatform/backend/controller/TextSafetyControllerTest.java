package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.AiRequestRateLimiter;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class TextSafetyControllerTest {
    private final ContentModerationClient moderation = mock(ContentModerationClient.class);
    private final ContentSafetyCheck safety = new ContentSafetyCheck(new BlockedWordList(List.of("từ cấm")), moderation, false);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new TextSafetyController(safety, new AiRequestRateLimiter(Clock.systemUTC())))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .build();

    @AfterEach
    void clearPrincipal() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void checksAuthorizationAndPayloadBeforeModeration() throws Exception {
        mvc.perform(request("{\"texts\":[\"con mèo\"]}")).andExpect(status().isUnauthorized());
        authenticate();
        mvc.perform(request("{\"texts\":[]}")).andExpect(status().isBadRequest());
        mvc.perform(request("{\"texts\":[null]}")).andExpect(status().isBadRequest());
        mvc.perform(request("{\"texts\":[\"" + "a".repeat(1001) + "\"]}")).andExpect(status().isBadRequest());
        mvc.perform(request("{\"texts\":[\"từ cấm\"]}")).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.error.code").value("UNSAFE_CONTENT"));
        // Khởi tạo ContentSafetyCheck kiểm tra cấu hình, còn các request trên không gọi dịch vụ ngoài.
        verify(moderation).isConfigured();
        verifyNoMoreInteractions(moderation);
    }

    @Test
    void distinguishesApprovalFromRejectionAndProviderFailure() throws Exception {
        authenticate();
        when(moderation.isConfigured()).thenReturn(true);
        when(moderation.moderate(anyList()))
                .thenReturn(List.of(new ModerationResult(false, List.of())))
                .thenReturn(List.of(new ModerationResult(true, List.of("violence"))))
                .thenThrow(new ModerationUnavailableException("Không khả dụng"));
        mvc.perform(request("{\"texts\":[\"con mèo\"]}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.safe").value(true));
        mvc.perform(request("{\"texts\":[\"câu bị gắn cờ\"]}")).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.error.code").value("UNSAFE_CONTENT"));
        mvc.perform(request("{\"texts\":[\"con cá\"]}")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("SERVICE_UNAVAILABLE"));
    }

    private static MockHttpServletRequestBuilder request(String json) {
        return post("/api/games/validate-text").contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private static void authenticate() {
        var teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.test", "session");
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(teacher, null, List.of()));
    }
}
