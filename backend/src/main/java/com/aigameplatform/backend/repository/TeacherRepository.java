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

    Page<Teacher> findByStatus(TeacherAccountStatus status, Pageable pageable);

    @Query("SELECT t FROM Teacher t WHERE LOWER(t.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.email) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY t.createdAt DESC")
    Page<Teacher> findBySearch(@Param("search") String search, Pageable pageable);

    @Query("SELECT t FROM Teacher t WHERE (LOWER(t.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.email) LIKE LOWER(CONCAT('%', :search, '%'))) AND t.status = :status ORDER BY t.createdAt DESC")
    Page<Teacher> findBySearchAndStatus(@Param("search") String search, @Param("status") TeacherAccountStatus status, Pageable pageable);

    default Page<Teacher> searchTeachers(String search, TeacherAccountStatus status, Pageable pageable) {
        if (search != null && !search.isBlank() && status != null) {
            return findBySearchAndStatus(search.trim(), status, pageable);
        } else if (search != null && !search.isBlank()) {
            return findBySearch(search.trim(), pageable);
        } else if (status != null) {
            return findByStatus(status, pageable);
        } else {
            return findAll(pageable);
        }
    }
}
