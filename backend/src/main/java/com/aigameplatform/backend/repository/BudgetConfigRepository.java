package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.BudgetConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BudgetConfigRepository extends JpaRepository<BudgetConfig, String> {
}
