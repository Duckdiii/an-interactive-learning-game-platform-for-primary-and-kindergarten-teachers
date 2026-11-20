package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.config.OpenApiConfig;
import com.aigameplatform.backend.dto.admin.AiConfigInput;
import com.aigameplatform.backend.dto.admin.AiConfigResponseDto;
import com.aigameplatform.backend.dto.admin.AiConfigVersionDto;
import com.aigameplatform.backend.dto.admin.BlockedWordsDto;
import com.aigameplatform.backend.dto.admin.FreezeAiConfigRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.admin.AiConfigService;
import com.aigameplatform.backend.service.admin.SafetyAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin", description = "Quản trị viên cấu hình AI & An toàn học đường (ROLE_ADMIN)")
@RestController
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AdminAiConfigController {

    private final AiConfigService aiConfigService;
    private final SafetyAdminService safetyAdminService;

    public AdminAiConfigController(
            AiConfigService aiConfigService,
            SafetyAdminService safetyAdminService) {
        this.aiConfigService = aiConfigService;
        this.safetyAdminService = safetyAdminService;
    }

    @Operation(summary = "Phiên bản cấu hình AI đang áp dụng và lịch sử (UC-14)")
    @GetMapping({"/api/admin/ai-config", "/admin/ai-config"})
    public ResponseEntity<ApiResponse<AiConfigResponseDto>> getAiConfig() {
        AiConfigResponseDto data = aiConfigService.getAiConfig();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "Tạo và áp dụng phiên bản cấu hình AI mới (UC-14)")
    @PostMapping({"/api/admin/ai-config/versions", "/admin/ai-config/versions"})
    public ResponseEntity<ApiResponse<AiConfigVersionDto>> createAiConfigVersion(
            @Valid @RequestBody AiConfigInput input,
            @AuthenticationPrincipal AuthenticatedTeacher teacher,
            HttpServletRequest request) {
        String ip = resolveClientIp(request);
        AiConfigVersionDto created = aiConfigService.createVersion(input, teacher, ip);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(summary = "Đóng băng một phiên bản làm bản chuẩn (UC-14)")
    @PostMapping({"/api/admin/ai-config/versions/{versionId}/freeze", "/admin/ai-config/versions/{versionId}/freeze"})
    public ResponseEntity<ApiResponse<AiConfigVersionDto>> freezeAiConfigVersion(
            @PathVariable String versionId,
            @RequestBody(required = false) FreezeAiConfigRequest freezeRequest,
            @AuthenticationPrincipal AuthenticatedTeacher teacher,
            HttpServletRequest request) {
        String ip = resolveClientIp(request);
        AiConfigVersionDto frozen = aiConfigService.freezeVersion(versionId, freezeRequest, teacher, ip);
        return ResponseEntity.ok(ApiResponse.success(frozen));
    }

    @Operation(summary = "Khôi phục phiên bản làm bản đang áp dụng (UC-14)")
    @PostMapping({"/api/admin/ai-config/versions/{versionId}/activate", "/admin/ai-config/versions/{versionId}/activate"})
    public ResponseEntity<ApiResponse<AiConfigVersionDto>> activateAiConfigVersion(
            @PathVariable String versionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher,
            HttpServletRequest request) {
        String ip = resolveClientIp(request);
        AiConfigVersionDto activated = aiConfigService.activateVersion(versionId, teacher, ip);
        return ResponseEntity.ok(ApiResponse.success(activated));
    }

    @Operation(summary = "Danh sách từ cấm an toàn học đường (FLD-25)")
    @GetMapping({"/api/admin/safety/blocked-words", "/admin/safety/blocked-words"})
    public ResponseEntity<ApiResponse<BlockedWordsDto>> getBlockedWords() {
        BlockedWordsDto data = safetyAdminService.getBlockedWords();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "Thay toàn bộ danh sách từ cấm (hot-reload)")
    @PutMapping({"/api/admin/safety/blocked-words", "/admin/safety/blocked-words"})
    public ResponseEntity<ApiResponse<BlockedWordsDto>> replaceBlockedWords(
            @Valid @RequestBody BlockedWordsDto request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher,
            HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        BlockedWordsDto updated = safetyAdminService.replaceBlockedWords(request, teacher, ip);
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
