package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.AuditLog;
import com.aigameplatform.backend.entity.enums.AuditResult;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:actorId IS NULL OR a.actorId = :actorId)
          AND (:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%')))
          AND (:result IS NULL OR a.result = :result)
          AND (CAST(:from AS timestamp) IS NULL OR a.timestamp >= :from)
          AND (CAST(:to AS timestamp) IS NULL OR a.timestamp <= :to)
        ORDER BY a.timestamp DESC
    """)
    Page<AuditLog> searchLogs(
            @Param("actorId") String actorId,
            @Param("action") String action,
            @Param("result") AuditResult result,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);
}
