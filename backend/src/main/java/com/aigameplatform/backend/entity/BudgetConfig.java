package com.aigameplatform.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "budget_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetConfig {

    @Id
    private String id;

    @Column(name = "monthly_budget", nullable = false)
    private Double monthlyBudget;

    @Column(name = "yellow_pct", nullable = false)
    private Double yellowPct;

    @Column(name = "red_pct", nullable = false)
    private Double redPct;

    @Column(name = "cost_cap_exceeded", nullable = false)
    private boolean costCapExceeded;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
