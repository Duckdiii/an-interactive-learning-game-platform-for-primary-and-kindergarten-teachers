package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.session.GameSession;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionRepository extends JpaRepository<GameSession, String> {
    boolean existsByGame_IdAndStatus(String gameId, SessionStatus status);

    boolean existsByGame_IdAndStatusIn(String gameId, Collection<SessionStatus> statuses);

    Optional<GameSession> findByAccessCode(String accessCode);

    boolean existsByAccessCodeAndStatusNot(String accessCode, SessionStatus status);

    List<GameSession> findByGame_IdOrderByCreatedAtDesc(String gameId);

    List<GameSession> findByGame_IdAndStatusOrderByCreatedAtDesc(String gameId, SessionStatus status);
}
