package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.session.Participant;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

public interface ParticipantRepository extends JpaRepository<Participant, String> {

    /** Khóa dòng học sinh để hai lần nộp cùng câu của một em không tạo hai bản ghi. */
    // Hết 2 giây thì thôi chờ, tránh nhiều request xếp hàng giữ hết 5 kết nối của pool.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "2000"))
    @Query("select p from Participant p where p.id = :id")
    Optional<Participant> findByIdForUpdate(@Param("id") String id);
}
