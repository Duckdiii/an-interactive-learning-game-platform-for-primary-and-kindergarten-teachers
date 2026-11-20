package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.config.OpenApiConfig;
import com.aigameplatform.backend.dto.admin.BudgetConfigDto;
import com.aigameplatform.backend.dto.admin.SystemStatusDto;
import com.aigameplatform.backend.dto.admin.UsageReportDto;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.entity.enums.ServiceName;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.admin.CostMonitoringService;
import com.aigameplatform.backend.service.admin.SystemHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin", description = "Quản trị viên giám sát hạ tầng & chi phí AI (ROLE_ADMIN)")
@RestController
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AdminUsageController {

    private final CostMonitoringService costMonitoringService;
    private final SystemHealthService systemHealthService;

    public AdminUsageController(
            CostMonitoringService costMonitoringService,
            SystemHealthService systemHealthService) {
        this.costMonitoringService = costMonitoringService;
        this.systemHealthService = systemHealthService;
    }

    @Operation(summary = "Chi phí và trạng thái dịch vụ (UC-12)")
    @GetMapping({"/api/admin/usage", "/admin/usage"})
    public ResponseEntity<ApiResponse<UsageReportDto>> getUsage(
            @RequestParam(required = false, defaultValue = "7D") String range,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) ServiceName service) {
        UsageReportDto data = costMonitoringService.getUsageReport(range, from, to, service);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "Sức khoẻ máy chủ (NFR-03)")
    @GetMapping({"/api/admin/system-status", "/admin/system-status"})
    public ResponseEntity<ApiResponse<SystemStatusDto>> getSystemStatus() {
        SystemStatusDto data = systemHealthService.getSystemStatus();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "Lấy cấu hình ngân sách và định mức cảnh báo")
    @GetMapping({"/api/admin/budget-config", "/admin/budget-config"})
    public ResponseEntity<ApiResponse<BudgetConfigDto>> getBudgetConfig() {
        BudgetConfigDto data = costMonitoringService.getBudgetConfig();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "Cập nhật cấu hình trần ngân sách AI và mức cảnh báo")
    @PostMapping({"/api/admin/budget-config", "/admin/budget-config"})
    public ResponseEntity<ApiResponse<BudgetConfigDto>> updateBudgetConfig(
            @Valid @RequestBody BudgetConfigDto request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher,
            HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        BudgetConfigDto updated = costMonitoringService.updateBudgetConfig(request, teacher, ip);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
