package com.aigameplatform.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.media.NotoEmojiCatalog;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class NotoCatalogControllerTest {
    private MockMvc mvc;

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new NotoCatalogController(new NotoEmojiCatalog()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
    }

    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @Test void teacherCanReadCatalogAssets() throws Exception {
        var teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.invalid", "session-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(teacher, "", List.of()));
        mvc.perform(get("/api/catalog/noto"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("cat-face"))
                .andExpect(jsonPath("$.data[0].imageUrl").value("/assets/noto/emoji_u1f431.svg"));
    }

    @Test void noTeacherCannotReadCatalog() throws Exception {
        mvc.perform(get("/api/catalog/noto"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
}
