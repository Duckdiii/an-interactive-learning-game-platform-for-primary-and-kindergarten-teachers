package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.session.Team;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, String> {
}
