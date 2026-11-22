package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.config.OpenApiConfig;
import com.aigameplatform.backend.dto.admin.AdminCreateTeacherRequest;
import com.aigameplatform.backend.dto.admin.AdminTeacherDto;
import com.aigameplatform.backend.dto.admin.AdminUpdateTeacherRequest;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.dto.admin.TeacherStatusResultDto;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.admin.TeacherAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin", description = "Quản trị viên hệ thống (ROLE_ADMIN)")
@RestController
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AdminTeacherController {

    private final TeacherAdminService teacherAdminService;

    public AdminTeacherController(TeacherAdminService teacherAdminService) {
        this.teacherAdminService = teacherAdminService;
    }

    @Operation(summary = "Danh sách giáo viên (UC-13)")
    @GetMapping("/api/admin/teachers")
    public ResponseEntity<ApiResponse<PageResultDto<AdminTeacherDto>>> listTeachers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TeacherStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return ResponseEntity.ok(ApiResponse.ok(teacherAdminService.listTeachers(search, status, pageable)));
    }

    @Operation(summary = "Thêm giáo viên (UC-13)")
    @PostMapping("/api/admin/teachers")
    public ResponseEntity<ApiResponse<AdminTeacherDto>> createTeacher(
            @Valid @RequestBody AdminCreateTeacherRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher admin,
            HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        AdminTeacherDto created = teacherAdminService.createTeacher(request, admin, ip);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @Operation(summary = "Chi tiết một giáo viên")
    @GetMapping("/api/admin/teachers/{teacherId}")
    public ResponseEntity<ApiResponse<AdminTeacherDto>> getTeacher(
            @PathVariable String teacherId) {
        return ResponseEntity.ok(ApiResponse.ok(teacherAdminService.getTeacher(teacherId)));
    }

    @Operation(summary = "Sửa thông tin giáo viên")
    @PutMapping("/api/admin/teachers/{teacherId}")
    public ResponseEntity<ApiResponse<AdminTeacherDto>> updateTeacher(
            @PathVariable String teacherId,
            @Valid @RequestBody AdminUpdateTeacherRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher admin,
            HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(teacherAdminService.updateTeacher(teacherId, request, admin, ip)));
    }

    @Operation(summary = "Khoá tài khoản giáo viên")
    @PostMapping("/api/admin/teachers/{teacherId}/lock")
    public ResponseEntity<ApiResponse<TeacherStatusResultDto>> lockTeacher(
            @PathVariable String teacherId,
            @AuthenticationPrincipal AuthenticatedTeacher admin,
            HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(teacherAdminService.lockTeacher(teacherId, admin, ip)));
    }

    @Operation(summary = "Mở khoá tài khoản giáo viên")
    @PostMapping("/api/admin/teachers/{teacherId}/unlock")
    public ResponseEntity<ApiResponse<TeacherStatusResultDto>> unlockTeacher(
            @PathVariable String teacherId,
            @AuthenticationPrincipal AuthenticatedTeacher admin,
            HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(teacherAdminService.unlockTeacher(teacherId, admin, ip)));
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
