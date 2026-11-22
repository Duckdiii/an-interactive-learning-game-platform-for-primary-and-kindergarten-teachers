package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.AiConfigVersion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AiConfigVersionRepository extends JpaRepository<AiConfigVersion, String> {

    Optional<AiConfigVersion> findFirstByActiveTrue();

    List<AiConfigVersion> findAllByOrderByCreatedAtDesc();

    @Modifying
    @Query("UPDATE AiConfigVersion a SET a.active = false WHERE a.active = true")
    void deactivateAll();
}
