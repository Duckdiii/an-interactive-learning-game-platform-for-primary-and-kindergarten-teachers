package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.EditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EditLogRepository extends JpaRepository<EditLog, String> {
}
