package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.lesson.LessonPreparationService;
import com.aigameplatform.backend.service.lesson.PreparedLesson;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

class LessonPreparationControllerTest {
    private final LessonPreparationService service = org.mockito.Mockito.mock(LessonPreparationService.class);
    private MockMvc mvc;
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new LessonPreparationController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(teacher, "N/A", List.of()));
    }

    @AfterEach
    void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test
    void oneLessonFileReturnsReviewableIdeaWithoutCreatingAGame() throws Exception {
        var file = new MockMultipartFile("file", "lesson.docx", "application/octet-stream", new byte[] {1, 2});
        when(service.prepare(eq(Subject.MATH), eq(GradeLevel.GRADE_1), eq("Đếm số"),
                org.mockito.ArgumentMatchers.any(MultipartFile.class), eq(teacher)))
                .thenReturn(new PreparedLesson("Dạy học sinh lớp 1 đếm từ một đến năm."));

        mvc.perform(multipart("/api/games/prepare").file(file)
                        .param("subject", "MATH").param("gradeLevel", "GRADE_1").param("idea", "Đếm số"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.idea").value("Dạy học sinh lớp 1 đếm từ một đến năm."));

        verify(service).prepare(eq(Subject.MATH), eq(GradeLevel.GRADE_1), eq("Đếm số"),
                org.mockito.ArgumentMatchers.any(MultipartFile.class), eq(teacher));
    }

    @Test
    void moreThanOneLessonFileIsRejectedBeforePreparation() throws Exception {
        mvc.perform(multipart("/api/games/prepare")
                        .file(new MockMultipartFile("file", "one.docx", "application/octet-stream", new byte[] {1}))
                        .file(new MockMultipartFile("file", "two.pdf", "application/pdf", new byte[] {2}))
                        .param("subject", "MATH").param("gradeLevel", "GRADE_1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        verifyNoInteractions(service);
    }

    @Test
    void unsupportedSubjectValueUsesTheStandardValidationEnvelope() throws Exception {
        mvc.perform(multipart("/api/games/prepare")
                        .file(new MockMultipartFile("file", "lesson.pdf", "application/pdf", new byte[] {1}))
                        .param("subject", "UNKNOWN").param("gradeLevel", "GRADE_1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        verifyNoInteractions(service);
    }
}
