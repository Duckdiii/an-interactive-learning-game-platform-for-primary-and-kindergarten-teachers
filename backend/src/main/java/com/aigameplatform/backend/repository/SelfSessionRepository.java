package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.session.SelfSession;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SelfSessionRepository extends JpaRepository<SelfSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SelfSession s where s.id = :id")
    Optional<SelfSession> findByIdForUpdate(@Param("id") String id);
}
