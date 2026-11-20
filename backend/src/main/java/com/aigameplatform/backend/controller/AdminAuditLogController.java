package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.config.OpenApiConfig;
import com.aigameplatform.backend.dto.admin.AuditLogDto;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.service.admin.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin", description = "Quản trị viên hệ thống (ROLE_ADMIN)")
@RestController
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AdminAuditLogController {

    private final AuditLogService auditLogService;

    public AdminAuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @Operation(summary = "Audit Log (FLD-28)")
    @GetMapping({"/api/admin/audit-logs", "/admin/audit-logs"})
    public ResponseEntity<ApiResponse<PageResultDto<AuditLogDto>>> listAuditLogs(
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) AuditResult result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.searchLogs(actorId, action, result, from, to, pageable)));
    }
}
