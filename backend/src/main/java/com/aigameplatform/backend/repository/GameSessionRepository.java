package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.session.GameSession;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameSessionRepository extends JpaRepository<GameSession, String> {

    boolean existsByGame_IdAndAccessCodeIsNotNullAndStatusIn(String gameId, Collection<SessionStatus> statuses);

    @Query("""
            select count(s) > 0 from GameSession s
            where s.game.id = :gameId and s.status in :statuses
            and not exists (select self.id from SelfSession self where self.id = s.id
                and (self.sessionExpiresAt is null or self.sessionExpiresAt <= :now))
            """)
    boolean hasUnfinishedSession(@Param("gameId") String gameId, @Param("statuses") Collection<SessionStatus> statuses,
            @Param("now") LocalDateTime now);

    Optional<GameSession> findByAccessCode(String accessCode);

    boolean existsByAccessCodeAndStatusNot(String accessCode, SessionStatus status);

    List<GameSession> findByGame_IdOrderByCreatedAtDesc(String gameId);

    List<GameSession> findByGame_IdAndStatusOrderByCreatedAtDesc(String gameId, SessionStatus status);

    long countByStatus(SessionStatus status);

    long countByStatusIn(Collection<SessionStatus> statuses);
}
