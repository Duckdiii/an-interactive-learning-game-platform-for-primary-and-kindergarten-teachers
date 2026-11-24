package com.aigameplatform.backend.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.request.LoginRequest;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.AuthResult;
import com.aigameplatform.backend.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@AutoConfigureMockMvc
class AdminTeacherPostgresTest extends AbstractPostgresTest {
    private static final String PASSWORD = "Test-Only-Password-13!";
    private static final String TEACHERS = "/api/admin/teachers";

    @Autowired private MockMvc mvc;
    @Autowired private TeacherRepository teachers;
    @Autowired private PasswordEncoder passwords;
    @Autowired private AuthService auth;

    @Test
    void listsOnlyTeachersAndRejectsAdminTargetsAndBlankNames() throws Exception {
        Teacher admin = account("filter-admin", UserRole.ROLE_ADMIN);
        Teacher teacher = account("filter-teacher", UserRole.ROLE_TEACHER);
        Teacher otherAdmin = account("filter-other-admin", UserRole.ROLE_ADMIN);
        AuthResult session = login(admin);
        String target = TEACHERS + "/" + teacher.getId();
        String adminTarget = TEACHERS + "/" + otherAdmin.getId();

        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                get(TEACHERS), get(TEACHERS).param("search", "uc13-filter"),
                get(TEACHERS).param("status", "ACTIVE"),
                get(TEACHERS).param("search", "uc13-filter").param("status", "ACTIVE")}) {
            mvc.perform(bearer(request.param("size", "100"), session)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.items[*].teacherId", hasItem(teacher.getId())))
                    .andExpect(jsonPath("$.data.items[*].teacherId", not(hasItem(otherAdmin.getId()))));
        }
        mvc.perform(bearer(get(target), session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(teacher.getEmail()));
        mvc.perform(bearer(get(target), login(teacher))).andExpect(status().isForbidden());
        mvc.perform(bearer(get(adminTarget), session)).andExpect(status().isNotFound());
        mvc.perform(bearer(post(adminTarget + "/lock"), session)).andExpect(status().isNotFound());
        mvc.perform(bearer(post(adminTarget + "/unlock"), session)).andExpect(status().isNotFound());
        mvc.perform(bearer(put(adminTarget).contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Tên mới\"}"), session)).andExpect(status().isNotFound());
        mvc.perform(bearer(put(target).contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"   \",\"school\":\"Trường mới\"}"), session))
                .andExpect(status().isBadRequest());
        assertThat(teachers.findById(teacher.getId()).orElseThrow().getSchool()).isNull();
        mvc.perform(bearer(put(target).contentType(MediaType.APPLICATION_JSON)
                .content("{\"school\":\"Trường mới\"}"), session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.school").value("Trường mới"));
    }

    @Test
    void lockAndUnlockPersistAndOldTokensStayRevoked() throws Exception {
        Teacher admin = account("lock-admin", UserRole.ROLE_ADMIN);
        Teacher teacher = account("lock-teacher", UserRole.ROLE_TEACHER);
        AuthResult adminSession = login(admin);
        AuthResult oldSession = login(teacher);
        String target = TEACHERS + "/" + teacher.getId();

        mvc.perform(bearer(get("/api/games"), oldSession)).andExpect(status().isOk());
        mvc.perform(bearer(post(target + "/lock"), adminSession)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"));
        mvc.perform(bearer(get("/api/games"), oldSession)).andExpect(status().isUnauthorized());
        mvc.perform(bearer(post(target + "/unlock"), adminSession)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
        mvc.perform(bearer(get("/api/games"), oldSession)).andExpect(status().isUnauthorized());
        assertThatThrownBy(() -> auth.refresh(oldSession.refreshToken())).isInstanceOf(ApiException.class);
        mvc.perform(bearer(get("/api/games"), login(teacher))).andExpect(status().isOk());
        mvc.perform(bearer(get("/api/admin/audit-logs").param("actorId", admin.getId()), adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].action", hasItem("POST " + target + "/lock")))
                .andExpect(jsonPath("$.data.items[*].action", hasItem("POST " + target + "/unlock")));
    }

    @Test
    void duplicateEmailReturnsConflictAndPersistsFailureAudit() throws Exception {
        Teacher admin = account("duplicate-admin", UserRole.ROLE_ADMIN);
        Teacher teacher = account("duplicate-teacher", UserRole.ROLE_TEACHER);
        AuthResult session = login(admin);

        mvc.perform(bearer(post(TEACHERS).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"fullName":"Tên khác","email":"%s","initialPassword":"%s"}
                        """.formatted(teacher.getEmail(), PASSWORD)), session)).andExpect(status().isConflict());

        mvc.perform(bearer(get("/api/admin/audit-logs")
                .param("actorId", admin.getId()).param("result", "FAILURE"), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.items[0].action").value("POST " + TEACHERS));
    }

    private Teacher account(String name, UserRole role) {
        Teacher teacher = new Teacher();
        teacher.setEmail("uc13-" + name + "@example.test");
        teacher.setFullName(name);
        teacher.setPasswordHash(passwords.encode(PASSWORD));
        teacher.setRole(role);
        return teachers.saveAndFlush(teacher);
    }

    private AuthResult login(Teacher teacher) {
        return auth.login(new LoginRequest(teacher.getEmail(), PASSWORD));
    }

    private static MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder request, AuthResult session) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + session.response().accessToken());
    }
}
