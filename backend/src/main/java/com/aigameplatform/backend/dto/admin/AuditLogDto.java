package com.aigameplatform.backend.dto.admin;

import com.aigameplatform.backend.entity.enums.AuditResult;
import java.time.LocalDateTime;

public record AuditLogDto(
        String logId,
        LocalDateTime timestamp,
        String actorId,
        String actorRole,
        String ip,
        String action,
        AuditResult result,
        String moderationResult
) {}
