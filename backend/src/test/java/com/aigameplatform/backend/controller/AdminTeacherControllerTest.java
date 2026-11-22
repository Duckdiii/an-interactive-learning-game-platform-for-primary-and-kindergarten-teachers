package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.admin.AdminCreateTeacherRequest;
import com.aigameplatform.backend.dto.admin.AdminTeacherDto;
import com.aigameplatform.backend.dto.admin.AdminUpdateTeacherRequest;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.dto.admin.TeacherStatusResultDto;
import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.admin.TeacherAdminService;
import java.time.LocalDateTime;
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
class AdminTeacherControllerTest {

    @Mock
    private TeacherAdminService teacherAdminService;

    private MockMvc mockMvc;
    private final AuthenticatedTeacher admin = new AuthenticatedTeacher("admin-id", "admin@school.vn", "s1", "ROLE_ADMIN");

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminTeacherController(teacherAdminService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        var auth = new UsernamePasswordAuthenticationToken(admin, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listTeachers_returns200() throws Exception {
        var dto = new AdminTeacherDto("t-1", "Nguyen Van A", "a@school.vn", "TH Chu Van An", TeacherStatus.ACTIVE, LocalDateTime.now());
        when(teacherAdminService.listTeachers(any(), any(), any()))
                .thenReturn(new PageResultDto<>(0, 20, 1, 1, List.of(dto)));

        mockMvc.perform(get("/api/admin/teachers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.items[0].email").value("a@school.vn"));
    }

    @Test
    void createTeacher_returns201() throws Exception {
        var dto = new AdminTeacherDto("t-2", "Tran Thi B", "b@school.vn", "TH Le Quy Don", TeacherStatus.ACTIVE, LocalDateTime.now());
        when(teacherAdminService.createTeacher(any(AdminCreateTeacherRequest.class), any(), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/api/admin/teachers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "fullName": "Tran Thi B",
                            "email": "b@school.vn",
                            "school": "TH Le Quy Don",
                            "initialPassword": "Password@123"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.teacherId").value("t-2"));
    }

    @Test
    void getTeacher_returns200() throws Exception {
        var dto = new AdminTeacherDto("t-1", "Nguyen Van A", "a@school.vn", "TH Chu Van An", TeacherStatus.ACTIVE, LocalDateTime.now());
        when(teacherAdminService.getTeacher("t-1")).thenReturn(dto);

        mockMvc.perform(get("/api/admin/teachers/t-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.teacherId").value("t-1"));
    }

    @Test
    void updateTeacher_returns200() throws Exception {
        var dto = new AdminTeacherDto("t-1", "Updated Name", "a@school.vn", "Updated School", TeacherStatus.ACTIVE, LocalDateTime.now());
        when(teacherAdminService.updateTeacher(eq("t-1"), any(AdminUpdateTeacherRequest.class), any(), any()))
                .thenReturn(dto);

        mockMvc.perform(put("/api/admin/teachers/t-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "fullName": "Updated Name",
                            "school": "Updated School"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Updated Name"));
    }

    @Test
    void lockTeacher_returns200() throws Exception {
        when(teacherAdminService.lockTeacher(eq("t-1"), any(), any()))
                .thenReturn(new TeacherStatusResultDto("t-1", TeacherStatus.LOCKED));

        mockMvc.perform(post("/api/admin/teachers/t-1/lock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("LOCKED"));
    }

    @Test
    void unlockTeacher_returns200() throws Exception {
        when(teacherAdminService.unlockTeacher(eq("t-1"), any(), any()))
                .thenReturn(new TeacherStatusResultDto("t-1", TeacherStatus.ACTIVE));

        mockMvc.perform(post("/api/admin/teachers/t-1/unlock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }
}
