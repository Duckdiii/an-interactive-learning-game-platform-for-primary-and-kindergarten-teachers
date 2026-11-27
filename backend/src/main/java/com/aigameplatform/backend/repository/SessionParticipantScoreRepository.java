package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.session.SessionParticipantScore;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionParticipantScoreRepository extends JpaRepository<SessionParticipantScore, String> {

    List<SessionParticipantScore> findBySessionIdOrderByFinalScoreDesc(String sessionId);
}
