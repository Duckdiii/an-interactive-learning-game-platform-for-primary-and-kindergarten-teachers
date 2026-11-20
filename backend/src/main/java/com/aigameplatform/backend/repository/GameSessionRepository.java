package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.session.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionRepository extends JpaRepository<GameSession, String> {
    boolean existsByGame_IdAndStatus(String gameId, SessionStatus status);
}
