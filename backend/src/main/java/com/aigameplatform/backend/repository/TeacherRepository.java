package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.TeacherAccountStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeacherRepository extends JpaRepository<Teacher, String> {

    Optional<Teacher> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("""
        SELECT t FROM Teacher t
        WHERE (:search IS NULL OR LOWER(t.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.email) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:status IS NULL OR t.status = :status)
        ORDER BY t.createdAt DESC
    """)
    Page<Teacher> searchTeachers(
            @Param("search") String search,
            @Param("status") TeacherAccountStatus status,
            Pageable pageable);
}
