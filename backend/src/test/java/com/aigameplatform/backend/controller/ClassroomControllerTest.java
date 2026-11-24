package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.classroom.ClassroomDto;
import com.aigameplatform.backend.dto.classroom.ClassroomRequest;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.classroom.ClassroomService;
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
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

@ExtendWith(MockitoExtension.class)
class ClassroomControllerTest {

    @Mock
    private ClassroomService classrooms;

    private MockMvc mvc;
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new ClassroomController(classrooms))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(teacher, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listReturnsTheTeachersClassrooms() throws Exception {
        when(classrooms.list("teacher-1")).thenReturn(List.of(new ClassroomDto("c1", "1A", "2026-2027", null)));

        mvc.perform(get("/api/classrooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].classroomId").value("c1"))
                .andExpect(jsonPath("$.data[0].className").value("1A"));
    }

    @Test
    void createReturns201WithTheNewClassroom() throws Exception {
        when(classrooms.create(eq("teacher-1"), any(ClassroomRequest.class)))
                .thenReturn(new ClassroomDto("c1", "1A", null, "Trường Hoa Mai"));

        mvc.perform(post("/api/classrooms").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"className\":\"1A\",\"schoolName\":\"Trường Hoa Mai\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.classroomId").value("c1"));
    }

    @Test
    void blankOrTooLongNameIs400() throws Exception {
        mvc.perform(post("/api/classrooms").contentType(MediaType.APPLICATION_JSON).content("{\"className\":\"  \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/classrooms").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"className\":\"" + "x".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidLearningProfileReportsTheSpecificField() throws Exception {
        mvc.perform(post("/api/classrooms").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"className\":\"1A\",\"learningProfile\":{\"studentCount\":0}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details['learningProfile.studentCount']").exists());
    }

    @Test
    void unsafeContentIs422() throws Exception {
        when(classrooms.create(eq("teacher-1"), any(ClassroomRequest.class)))
                .thenThrow(new UnsafeContentException("Nội dung chưa đạt chuẩn an toàn dành cho học sinh. Vui lòng điều chỉnh lại."));

        mvc.perform(post("/api/classrooms").contentType(MediaType.APPLICATION_JSON).content("{\"className\":\"x\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void updateAndDeleteUseTheClassroomIdAndTokenTeacher() throws Exception {
        when(classrooms.update(eq("teacher-1"), eq("c1"), any(ClassroomRequest.class)))
                .thenReturn(new ClassroomDto("c1", "1A mới", null, null));

        mvc.perform(put("/api/classrooms/c1").contentType(MediaType.APPLICATION_JSON).content("{\"className\":\"1A mới\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.className").value("1A mới"));
        mvc.perform(delete("/api/classrooms/c1")).andExpect(status().isNoContent());

        verify(classrooms).delete("teacher-1", "c1");
    }

    @Test
    void someoneElsesClassroomIs404() throws Exception {
        doThrow(new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy lớp học")).when(classrooms).delete("teacher-1", "c9");

        mvc.perform(delete("/api/classrooms/c9")).andExpect(status().isNotFound());
    }
}
