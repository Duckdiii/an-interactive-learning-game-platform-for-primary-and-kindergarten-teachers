package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.ServiceName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "service_usage_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceUsageRecord {

    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_name", nullable = false)
    private ServiceName serviceName;

    @Column(nullable = false)
    private Integer requests;

    @Column(name = "success_count", nullable = false)
    private Integer successCount;

    @Column(name = "failure_count", nullable = false)
    private Integer failureCount;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    private Double cost;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
