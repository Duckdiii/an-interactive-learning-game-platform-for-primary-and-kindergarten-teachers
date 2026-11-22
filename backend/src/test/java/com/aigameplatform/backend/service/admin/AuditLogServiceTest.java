package com.aigameplatform.backend.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.admin.AuditLogDto;
import com.aigameplatform.backend.dto.admin.PageResultDto;
import com.aigameplatform.backend.entity.AuditLog;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.repository.AuditLogRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditLogService service;

    @BeforeEach
    void setUp() {
        service = new AuditLogService(auditLogRepository);
    }

    @Test
    void logAction_savesAuditLog() {
        AuditLog saved = new AuditLog();
        saved.setId("log-1");
        saved.setActorId("admin-1");
        saved.setActorRole("ROLE_ADMIN");
        saved.setAction("LOCK_TEACHER");
        saved.setResult(AuditResult.SUCCESS);

        when(auditLogRepository.save(any(AuditLog.class))).thenReturn(saved);

        AuditLog result = service.logAction("admin-1", "ROLE_ADMIN", "127.0.0.1", "LOCK_TEACHER", AuditResult.SUCCESS, null, "Details");

        assertThat(result.getId()).isEqualTo("log-1");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void searchLogs_returnsPagedResult() {
        AuditLog log = new AuditLog();
        log.setId("log-1");
        log.setActorId("admin-1");
        log.setActorRole("ROLE_ADMIN");
        log.setAction("LOCK_TEACHER");
        log.setResult(AuditResult.SUCCESS);
        log.setTimestamp(LocalDateTime.now());

        Pageable pageable = PageRequest.of(0, 10);
        when(auditLogRepository.searchLogs(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(log), pageable, 1));

        PageResultDto<AuditLogDto> result = service.searchLogs(null, null, null, null, null, pageable);

        assertThat(result.totalItems()).isEqualTo(1);
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).action()).isEqualTo("LOCK_TEACHER");
    }
}
