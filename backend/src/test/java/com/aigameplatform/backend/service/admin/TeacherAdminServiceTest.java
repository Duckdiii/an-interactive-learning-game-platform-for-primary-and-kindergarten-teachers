package com.aigameplatform.backend.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.admin.AdminCreateTeacherRequest;
import com.aigameplatform.backend.dto.admin.AdminTeacherDto;
import com.aigameplatform.backend.dto.admin.AdminUpdateTeacherRequest;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.dto.admin.TeacherStatusResultDto;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.entity.enums.TeacherAccountStatus;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class TeacherAdminServiceTest {

    @Mock
    private TeacherRepository teacherRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    private TeacherAdminService service;

    private final AuthenticatedTeacher admin = new AuthenticatedTeacher("admin-id", "admin@school.vn", "s1", "ROLE_ADMIN");

    @BeforeEach
    void setUp() {
        service = new TeacherAdminService(
                teacherRepository,
                refreshTokenRepository,
                passwordEncoder,
                auditLogService);
    }

    @Test
    void listTeachers_returnsPagedResult() {
        Teacher t = new Teacher();
        t.setId("t-1");
        t.setFullName("Nguyen Van A");
        t.setEmail("a@school.vn");
        t.setSchool("TH Chu Van An");
        t.setStatus(TeacherAccountStatus.ACTIVE);
        t.setCreatedAt(LocalDateTime.now());

        Pageable pageable = PageRequest.of(0, 10);
        when(teacherRepository.searchTeachers("Nguyen", TeacherAccountStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(t), pageable, 1));

        PageResultDto<AdminTeacherDto> result = service.listTeachers("Nguyen", TeacherAccountStatus.ACTIVE, pageable);

        assertThat(result.totalItems()).isEqualTo(1);
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).email()).isEqualTo("a@school.vn");
    }

    @Test
    void getTeacher_whenExists_returnsDto() {
        Teacher t = new Teacher();
        t.setId("t-1");
        t.setFullName("Nguyen Van A");
        t.setEmail("a@school.vn");
        t.setSchool("TH Chu Van An");
        when(teacherRepository.findById("t-1")).thenReturn(Optional.of(t));

        AdminTeacherDto dto = service.getTeacher("t-1");

        assertThat(dto.teacherId()).isEqualTo("t-1");
        assertThat(dto.fullName()).isEqualTo("Nguyen Van A");
    }

    @Test
    void getTeacher_whenNotFound_throwsNotFound() {
        when(teacherRepository.findById("t-none")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getTeacher("t-none"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_FOUND);
    }

    @Test
    void createTeacher_whenEmailAvailable_createsAndLogsAudit() {
        AdminCreateTeacherRequest req = new AdminCreateTeacherRequest(
                "Tran Thi B", "b@school.vn", "TH Le Quy Don", "Pass@123");

        when(teacherRepository.existsByEmail("b@school.vn")).thenReturn(false);
        when(passwordEncoder.encode("Pass@123")).thenReturn("hashed-pass");

        Teacher saved = new Teacher();
        saved.setId("t-2");
        saved.setFullName("Tran Thi B");
        saved.setEmail("b@school.vn");
        saved.setSchool("TH Le Quy Don");
        saved.setRole(UserRole.ROLE_TEACHER);
        saved.setStatus(TeacherAccountStatus.ACTIVE);
        saved.setCreatedAt(LocalDateTime.now());
        when(teacherRepository.save(any(Teacher.class))).thenReturn(saved);

        AdminTeacherDto dto = service.createTeacher(req, admin, "127.0.0.1");

        assertThat(dto.teacherId()).isEqualTo("t-2");
        assertThat(dto.email()).isEqualTo("b@school.vn");
        verify(auditLogService).logAction(
                eq("admin-id"), eq("ROLE_ADMIN"), eq("127.0.0.1"),
                eq("POST /api/admin/teachers"), eq(AuditResult.SUCCESS),
                eq(null), anyString());
    }

    @Test
    void createTeacher_whenEmailExists_throwsConflictAndLogsFailure() {
        AdminCreateTeacherRequest req = new AdminCreateTeacherRequest(
                "Tran Thi B", "b@school.vn", "TH Le Quy Don", "Pass@123");

        when(teacherRepository.existsByEmail("b@school.vn")).thenReturn(true);

        assertThatThrownBy(() -> service.createTeacher(req, admin, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CONFLICT);

        verify(auditLogService).logAction(
                eq("admin-id"), eq("ROLE_ADMIN"), eq("127.0.0.1"),
                eq("POST /api/admin/teachers"), eq(AuditResult.FAILURE),
                eq(null), anyString());
    }

    @Test
    void updateTeacher_updatesFullNameAndSchool() {
        Teacher t = new Teacher();
        t.setId("t-1");
        t.setFullName("Old Name");
        t.setEmail("a@school.vn");
        t.setSchool("Old School");

        when(teacherRepository.findById("t-1")).thenReturn(Optional.of(t));
        when(teacherRepository.save(any(Teacher.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUpdateTeacherRequest req = new AdminUpdateTeacherRequest("New Name", "New School");
        AdminTeacherDto dto = service.updateTeacher("t-1", req, admin, "127.0.0.1");

        assertThat(dto.fullName()).isEqualTo("New Name");
        assertThat(dto.school()).isEqualTo("New School");
        verify(auditLogService).logAction(
                eq("admin-id"), eq("ROLE_ADMIN"), eq("127.0.0.1"),
                eq("PUT /api/admin/teachers/t-1"), eq(AuditResult.SUCCESS),
                eq(null), anyString());
    }

    @Test
    void lockTeacher_locksAccountAndRevokesTokens() {
        Teacher t = new Teacher();
        t.setId("t-1");
        t.setEmail("a@school.vn");
        t.setStatus(TeacherAccountStatus.ACTIVE);

        when(teacherRepository.findById("t-1")).thenReturn(Optional.of(t));

        TeacherStatusResultDto result = service.lockTeacher("t-1", admin, "127.0.0.1");

        assertThat(result.status()).isEqualTo(TeacherAccountStatus.LOCKED);
        assertThat(t.getStatus()).isEqualTo(TeacherAccountStatus.LOCKED);
        verify(refreshTokenRepository).revokeAllByTeacherId(eq("t-1"), any(LocalDateTime.class));
        verify(auditLogService).logAction(
                eq("admin-id"), eq("ROLE_ADMIN"), eq("127.0.0.1"),
                eq("POST /api/admin/teachers/t-1/lock"), eq(AuditResult.SUCCESS),
                eq(null), anyString());
    }

    @Test
    void lockTeacher_whenSelfLock_throwsValidationError() {
        Teacher t = new Teacher();
        t.setId("admin-id");
        when(teacherRepository.findById("admin-id")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> service.lockTeacher("admin-id", admin, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void unlockTeacher_unlocksAccount() {
        Teacher t = new Teacher();
        t.setId("t-1");
        t.setEmail("a@school.vn");
        t.setStatus(TeacherAccountStatus.LOCKED);

        when(teacherRepository.findById("t-1")).thenReturn(Optional.of(t));

        TeacherStatusResultDto result = service.unlockTeacher("t-1", admin, "127.0.0.1");

        assertThat(result.status()).isEqualTo(TeacherAccountStatus.ACTIVE);
        assertThat(t.getStatus()).isEqualTo(TeacherAccountStatus.ACTIVE);
        verify(auditLogService).logAction(
                eq("admin-id"), eq("ROLE_ADMIN"), eq("127.0.0.1"),
                eq("POST /api/admin/teachers/t-1/unlock"), eq(AuditResult.SUCCESS),
                eq(null), anyString());
    }
}
