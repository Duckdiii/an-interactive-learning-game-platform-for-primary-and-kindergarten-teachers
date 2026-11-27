package com.aigameplatform.backend.service.admin;

import com.aigameplatform.backend.dto.admin.AuditLogDto;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.entity.AuditLog;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.repository.AuditLogRepository;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog logAction(
            String actorId,
            String actorRole,
            String ip,
            String action,
            AuditResult result,
            String moderationResult,
            String details) {
        AuditLog logEntry = new AuditLog();
        logEntry.setActorId(actorId != null ? actorId : "anonymous");
        logEntry.setActorRole(actorRole != null ? actorRole : "UNKNOWN");
        logEntry.setIp(ip);
        logEntry.setAction(action);
        logEntry.setResult(result != null ? result : AuditResult.SUCCESS);
        logEntry.setModerationResult(moderationResult);
        logEntry.setDetails(details);
        logEntry.setTimestamp(LocalDateTime.now());
        return auditLogRepository.save(logEntry);
    }

    @Transactional(readOnly = true)
    public PageResultDto<AuditLogDto> searchLogs(
            String actorId,
            String action,
            AuditResult result,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {
        Page<AuditLog> page = auditLogRepository.searchLogs(actorId, action, result, from, to, pageable);
        var items = page.getContent().stream()
                .map(this::toDto)
                .toList();
        return new PageResultDto<>(
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                items);
    }

    private AuditLogDto toDto(AuditLog log) {
        return new AuditLogDto(
                log.getId(),
                log.getTimestamp(),
                log.getActorId(),
                log.getActorRole(),
                log.getIp(),
                log.getAction(),
                log.getResult(),
                log.getModerationResult());
    }
}
