package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.ServiceUsageRecord;
import com.aigameplatform.backend.entity.enums.ServiceName;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceUsageRecordRepository extends JpaRepository<ServiceUsageRecord, String> {

    Optional<ServiceUsageRecord> findByServiceNameAndRecordDate(ServiceName serviceName, LocalDate recordDate);

    List<ServiceUsageRecord> findByRecordDateBetweenOrderByRecordDateAsc(LocalDate from, LocalDate to);

    List<ServiceUsageRecord> findByServiceNameAndRecordDateBetweenOrderByRecordDateAsc(
            ServiceName serviceName, LocalDate from, LocalDate to);
}
