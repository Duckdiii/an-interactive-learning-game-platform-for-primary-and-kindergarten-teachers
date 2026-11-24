package com.aigameplatform.backend.service.admin;

import com.aigameplatform.backend.dto.admin.AdminCreateTeacherRequest;
import com.aigameplatform.backend.dto.admin.AdminTeacherDto;
import com.aigameplatform.backend.dto.admin.AdminUpdateTeacherRequest;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.dto.admin.TeacherStatusResultDto;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.RefreshTokenRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class TeacherAdminService {

    private final TeacherRepository teacherRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final Clock clock;

    public TeacherAdminService(
            TeacherRepository teacherRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            Clock clock) {
        this.teacherRepository = teacherRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResultDto<AdminTeacherDto> listTeachers(
            String search, TeacherStatus status, Pageable pageable) {
        String trimmedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<Teacher> page = teacherRepository.searchTeachers(trimmedSearch, status, pageable);
        var items = page.getContent().stream().map(this::toDto).toList();
        return new PageResultDto<>(
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                items);
    }

    @Transactional(readOnly = true)
    public AdminTeacherDto getTeacher(String teacherId) {
        return toDto(requireTeacher(teacherId));
    }

    // Lỗi email trùng chỉ xảy ra trước khi tạo tài khoản, giữ lại bản ghi FAILURE khi trả về 409.
    @Transactional(noRollbackFor = ApiException.class)
    public AdminTeacherDto createTeacher(
            AdminCreateTeacherRequest req, AuthenticatedTeacher admin, String ip) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (teacherRepository.existsByEmail(email)) {
            auditLogService.logAction(
                    admin != null ? admin.teacherId() : null,
                    admin != null ? admin.role() : null,
                    ip,
                    "POST /api/admin/teachers",
                    AuditResult.FAILURE,
                    null,
                    "Tạo giáo viên thất bại: Email " + email + " đã tồn tại");
            throw new ApiException(ErrorCode.CONFLICT, "Email này đã tồn tại trong hệ thống");
        }

        Teacher teacher = new Teacher();
        teacher.setFullName(req.fullName().trim());
        teacher.setEmail(email);
        teacher.setSchool(req.school() != null ? req.school().trim() : null);
        teacher.setPasswordHash(passwordEncoder.encode(req.initialPassword()));
        teacher.setRole(UserRole.ROLE_TEACHER);
        teacher.setStatus(TeacherStatus.ACTIVE);
        teacher.setCreatedAt(LocalDateTime.now());
        Teacher saved = teacherRepository.save(teacher);

        auditLogService.logAction(
                admin != null ? admin.teacherId() : null,
                admin != null ? admin.role() : null,
                ip,
                "POST /api/admin/teachers",
                AuditResult.SUCCESS,
                null,
                "Thêm mới giáo viên: " + saved.getEmail() + " (ID: " + saved.getId() + ")");

        return toDto(saved);
    }

    @Transactional
    public AdminTeacherDto updateTeacher(
            String teacherId, AdminUpdateTeacherRequest req, AuthenticatedTeacher admin, String ip) {
        Teacher teacher = requireTeacher(teacherId);

        if (req.fullName() != null) {
            teacher.setFullName(req.fullName().trim());
        }
        if (req.school() != null) {
            teacher.setSchool(req.school().trim());
        }
        Teacher updated = teacherRepository.save(teacher);

        auditLogService.logAction(
                admin != null ? admin.teacherId() : null,
                admin != null ? admin.role() : null,
                ip,
                "PUT /api/admin/teachers/" + teacherId,
                AuditResult.SUCCESS,
                null,
                "Cập nhật thông tin giáo viên: " + updated.getEmail());

        return toDto(updated);
    }

    @Transactional
    public TeacherStatusResultDto lockTeacher(
            String teacherId, AuthenticatedTeacher admin, String ip) {
        if (admin != null && teacherId.equals(admin.teacherId())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Không thể tự khoá tài khoản của chính mình");
        }
        Teacher teacher = requireTeacher(teacherId);

        teacherRepository.lockTeacherAccount(teacherId);

        refreshTokenRepository.revokeAllByTeacherId(teacherId, LocalDateTime.now(clock));

        auditLogService.logAction(
                admin != null ? admin.teacherId() : null,
                admin != null ? admin.role() : null,
                ip,
                "POST /api/admin/teachers/" + teacherId + "/lock",
                AuditResult.SUCCESS,
                null,
                "Khóa tài khoản giáo viên: " + teacher.getEmail());

        return new TeacherStatusResultDto(teacherId, TeacherStatus.LOCKED);
    }

    @Transactional
    public TeacherStatusResultDto unlockTeacher(
            String teacherId, AuthenticatedTeacher admin, String ip) {
        Teacher teacher = requireTeacher(teacherId);
        teacherRepository.unlockTeacherAccount(teacherId);

        auditLogService.logAction(
                admin != null ? admin.teacherId() : null,
                admin != null ? admin.role() : null,
                ip,
                "POST /api/admin/teachers/" + teacherId + "/unlock",
                AuditResult.SUCCESS,
                null,
                "Mở khóa tài khoản giáo viên: " + teacher.getEmail());

        return new TeacherStatusResultDto(teacherId, TeacherStatus.ACTIVE);
    }

    private Teacher requireTeacher(String teacherId) {
        return teacherRepository.findByIdAndRole(teacherId, UserRole.ROLE_TEACHER)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy giáo viên với mã: " + teacherId));
    }

    private AdminTeacherDto toDto(Teacher t) {
        return new AdminTeacherDto(
                t.getId(),
                t.getFullName(),
                t.getEmail(),
                t.getSchool(),
                t.getStatus(),
                t.getCreatedAt());
    }
}
